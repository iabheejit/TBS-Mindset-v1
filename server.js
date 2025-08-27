const dotenv = require('dotenv');
if (process.env.NODE_ENV !== 'production') dotenv.config({ path: './.env' });

// now require project modules that read env at import time
const express = require('express');
const cron = require('node-cron');
const test = require('./test');
const WA = require('./wati');
const airtable = require('./update');

const webApp = express();
webApp.use(express.json());

// User Registration Handler
async function handleNewUser(senderID, userName = "Unknown") {
    try {
        // Check if user already exists
        let existingUser = await airtable.getID(senderID);
        
        if (!existingUser) {
            console.log(`Registering new user: ${senderID}`);
            
            // Create new user in Airtable
            const url = `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_ID}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Phone: senderID,
                        Name: userName,
                        Course: "TBS-Mindset",
                        "Next Day": 1,
                        "Next Module": 0,
                        "Day Completed": 0,
                        "Module Completed": 0,
                        "Registration Date": new Date().toISOString(),
                        "Last_Msg": "Welcome"
                    }
                })
            });
            
            if (response.ok) {
                console.log(`New user registered: ${senderID}`);
                
                // Send welcome message
                setTimeout(() => {
                    WA.sendText(`Welcome to the TBS Mindset Course! 🎉\n\nYou've been successfully enrolled. Your learning journey will begin tomorrow at 9 AM.\n\nIf you want to start immediately, type "Start Day".\n\n_Powered by ekatra.one_`, senderID);
                }, 1000);
                
                return true;
            } else {
                console.error('Failed to register user:', await response.text());
            }
        } else {
            console.log(`User ${senderID} already exists`);
        }
        return false;
    } catch (error) {
        console.error('Error registering new user:', error);
        return false;
    }
}

// Daily Course Delivery Function
async function deliverDailyCourse() {
    try {
        console.log('Starting daily course delivery...');
        
        // Get all active students
        const url = `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_ID}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.records.length} total users`);
        
        let sentCount = 0;
        
        // Process each student
        for (const record of data.records) {
            const phone = record.fields.Phone;
            const nextDay = record.fields["Next Day"];
            const nextModule = record.fields["Next Module"];
            const totalDays = await airtable.totalDays(phone);
            
            console.log(`User ${phone}: Day ${nextDay}, Module ${nextModule}`);
            
            // Only send to students who should receive new day content
            if (nextDay && nextModule === 0 && nextDay <= totalDays) {
                console.log(`✅ Sending Day ${nextDay} to ${phone}`);
                
                try {
                    // Update to start first module
                    await airtable.updateField(record.id, "Next Module", 1);
                    
                    // Send start day message
                    await test.sendModuleContent(phone);
                    sentCount++;
                    
                    // Small delay between users to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.error(`Error sending to ${phone}:`, error);
                }
            } else if (nextDay > totalDays) {
                console.log(`📚 User ${phone} has completed the course`);
            } else {
                console.log(`⏭️ Skipping ${phone} - not ready for new day`);
            }
        }
        
        console.log(`✅ Daily course delivery completed. Sent to ${sentCount} users.`);
    } catch (error) {
        console.error('❌ Error in daily course delivery:', error);
    }
}

// Route for WhatsApp Webhook
webApp.post('/web', async (req, res) => {
    try {
        let senderID = req.body.waId;
        let keyword = req.body.text || '';
        
        console.log(`📱 Received message from ${senderID}: ${keyword}`);
        console.log('Full request body:', JSON.stringify(req.body, null, 2));
        
        // Check for new user first
        let id = await airtable.getID(senderID);
        if (!id) {
            console.log(`👤 New user detected: ${senderID}`);
            await handleNewUser(senderID, req.body.senderName || "Unknown");
            res.status(200).send('New user registered');
            return;
        }
        
        // Get user current state
        let last_msg = await airtable.findLastMsg(senderID).catch(e => console.log("Last msg error:", e));
        let currentDay = await airtable.findField("Next Day", senderID).catch(e => console.log("Current day error:", e));
        let current_module = await airtable.findField("Next Module", senderID).catch(e => console.log("Current module error:", e));
        
        console.log(`📊 User state - Day: ${currentDay}, Module: ${current_module}, Last msg: ${last_msg}`);
        
        // Handle different message types
        if (req.body.listReply != null) {
            console.log("📋 List reply received");
            let reply = JSON.parse(JSON.stringify(req.body.listReply));
            await test.store_responses(senderID, reply.title)
                .catch(e => console.log("List response error:", e));
        }
        else if (keyword === "Let's Begin") {
            console.log("🚀 Let's Begin keyword detected");
            await test.findModule(currentDay, current_module, senderID)
                .catch(e => console.log("Let's begin error:", e));
        }
        else if (keyword === "Start Day") {
            console.log("📅 Start Day keyword detected");
            await test.sendModuleContent(senderID)
                .catch(e => console.log("Start day error:", e));
        }
        else if (keyword === "Next." || keyword === "नेक्स्ट") {
            console.log("⏭️ Next keyword detected");
            await test.markModuleComplete(senderID)
                .catch(e => console.log("Next module error:", e));
        }
        else {
            console.log("💬 Regular message - storing response");
            await test.store_quesResponse(senderID, keyword)
                .catch(e => console.log("Question response error:", e));
        }
        
        res.status(200).send('Message processed');
        
    } catch (error) {
        console.error('❌ Error in webhook handler:', error);
        res.status(500).send('Internal server error');
    }
});

// Manual trigger endpoints for testing
webApp.get('/trigger-daily', async (req, res) => {
    console.log('🔧 Manual daily course delivery triggered');
    await deliverDailyCourse();
    res.json({ 
        success: true, 
        message: 'Daily course delivery triggered',
        timestamp: new Date().toISOString()
    });
});

webApp.post('/send-course', async (req, res) => {
    try {
        const { phone, day, module } = req.body;
        
        console.log(`🔧 Manual course send: ${phone}, Day ${day}, Module ${module}`);
        
        if (module === 0 || module === "0") {
            await test.sendModuleContent(phone);
        } else {
            await test.findModule(day, module, phone);
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Course sent successfully',
            phone: phone,
            day: day,
            module: module
        });
    } catch (error) {
        console.error('❌ Error in send-course endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// quick health
webApp.get('/ping', (req, res) => res.status(200).send('OK'));

// Get system status
webApp.get('/status', async (req, res) => {
    try {
        // Test database connection
        const testUrl = `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_ID}?maxRecords=1`;
        const testResponse = await fetch(testUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        const dbStatus = testResponse.ok ? 'connected' : 'error';
        
        res.status(200).json({
            server: 'running',
            database: dbStatus,
            timestamp: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform
            }
        });
    } catch (error) {
        res.status(500).json({
            server: 'running',
            database: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Schedule daily course delivery at 9:00 AM IST
cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Scheduled daily course delivery starting...');
    await deliverDailyCourse();
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

// Optional: Schedule a reminder at 6 PM for incomplete modules
cron.schedule('0 18 * * *', async () => {
    console.log('⏰ Sending evening reminders...');
    // You can add reminder logic here if needed
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

// Start server
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
webApp.listen(PORT, HOST, () => {
    console.log('🚀 TBS WhatsApp Learning System Started');
    console.log(`Listening on ${HOST}:${PORT}`);
    console.log(`⏰ Daily course delivery scheduled for 9:00 AM IST`);
    console.log(`🌐 Webhook URL: ${process.env.WEBHOOK_URL || 'Not set'}/web`);
    console.log(`🏥 Health check: http://${HOST}:${PORT}/ping`);
    console.log('='.repeat(50));
});
    console.log(`🏥 Health check: http://${HOST}:${PORT}/ping`);
    console.log('='.repeat(50));
});
    console.log(`Listening on ${HOST}:${PORT}`);
    console.log(`⏰ Daily course delivery scheduled for 9:00 AM IST`);
    console.log(`🌐 Webhook URL: ${process.env.WEBHOOK_URL || 'Not set'}/web`);
    console.log(`🏥 Health check: http://${HOST}:${PORT}/ping`);
    console.log('='.repeat(50));
});
