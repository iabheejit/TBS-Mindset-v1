const { response } = require('express');

require('dotenv').config();

// Remove all lowercase env usage, use UPPERCASE only
let tableId = process.env.TABLE_ID;
let baseId = process.env.BASE_ID;
let apiKey = process.env.PERSONAL_ACCESS_TOKEN;

async function updateField(id, field_name, updatedValue) {
  try {
    const tableName = 'Test'; // Replace with your table name
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${id}`;
    // console.log("Update URL ",url)

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          [field_name]: updatedValue
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Record updated successfully:');
  } catch (error) {
    console.error('Error updating record:', error);
  }
}
// updateField("rec3UHUHucZVYTBoY", "Last_Msg", "hdhhdhdhdh")

async function getID(phone) {
  try {
    if (!phone) return null;
    const fbf = encodeURIComponent(`{Phone} = '${phone}'`);
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${fbf}&maxRecords=1&fields=Phone`;
    const r = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Airtable getID HTTP ${r.status}: ${txt}`);
    }
    const data = await r.json();
    return data.records?.[0]?.id ?? null;
  } catch (e) {
    console.error('getID error:', e);
    throw e;
  }
}

// Test function


const totalDays = async (number) => {
  try {
    

    // Assuming findTable is a function you've defined elsewhere
    const course_tn = await findTable(number);
    // console.log("course_tn", course_tn);

    const url = `https://api.airtable.com/v0/${baseId}/${course_tn}?fields%5B%5D=Day`;
    console.log(url)



    const response = await fetch(`${url}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();

    const count = data.records.length;
    console.log(count);
    return count;

  } catch (error) {
    console.error('Error in totalDays:', error);
    // //throw error;
  }
};

const findTable = async (number) => {

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

  const params = new URLSearchParams({
    filterByFormula: `({Phone} = "${number}")`,
    view: 'Grid view'
  });

  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      const course_tn = data.records[0].fields.Course;
      // console.log("Table Name = " + course_tn);
      return course_tn;
    } else {
      // throw new Error('No matching record found');
    }
  } catch (error) {
    console.error('Error in findTable:', error);
    //throw error;
  }
};



const findRecord = async (id) => {
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();

    const field_name = "Question Responses";
    return data.fields[field_name];
  } catch (error) {
    console.error('Error in findRecord:', error);
    // //throw error;
  }
};

const findQuesRecord = async (id) => {

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();
    // console.log("Data ", data)

    return data.fields.Responses;
  } catch (error) {
    console.error('Error in findQuesRecord:', error);
    // //throw error;
  }
};



const findTitle = async (currentDay, module_no, number) => {

  try {
    // First, get the course table name
    const course_tn = await findTable(number);

    const url = `https://api.airtable.com/v0/${baseId}/${course_tn}`;

    const params = new URLSearchParams({
      filterByFormula: `({Day} = ${currentDay})`,
      view: 'Grid view'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      for (const record of data.records) {
        const titleField = `Module ${module_no} LTitle`;
        const optionsField = `Module ${module_no} List`;

        const title = record.fields[titleField];
        const options = record.fields[optionsField];

        if (title !== undefined) {
          console.log(title, options.split("\n"));
          return [title, options.split("\n")];
        }
      }
      // If we've gone through all records and haven't returned, no matching title was found
      return [0, 0];
    } else {
      return [0, 0];
    }
  } catch (error) {
    console.error('Error in findTitle:', error);
    // //throw error;
  }
};




const findInteractive = async (currentDay, module_no, number) => {

  try {
    // First, get the course table name
    const course_tn = await findTable(number);

    const url = `https://api.airtable.com/v0/${baseId}/${course_tn}`;

    const params = new URLSearchParams({
      filterByFormula: `({Day} = ${currentDay})`,
      view: 'Grid view'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      for (const record of data.records) {
        const bodyField = `Module ${module_no} iBody`;
        const buttonsField = `Module ${module_no} iButtons`;

        const body = record.fields[bodyField];
        const buttons = record.fields[buttonsField];

        if (body !== undefined) {
          return [body, buttons.split("\n")];
        }
      }
      // If we've gone through all records and haven't returned, no matching body was found
      return "No matching interactive content found"
    } else {
      return "No records found for the given day"
    }
  } catch (error) {
    console.error('Error in findInteractive:', error);
    // //throw error;
  }
};


const findQuestion = async (currentDay, module_no, number) => {
 

  try {
    // First, get the course table name
    const course_tn = await findTable(number);

    const url = `https://api.airtable.com/v0/${baseId}/${course_tn}`;

    const params = new URLSearchParams({
      filterByFormula: `({Day} = ${currentDay})`,
      view: 'Grid view'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      for (const record of data.records) {
        const questionField = `Module ${module_no} Question`;
        const body = record.fields[questionField];

        if (body !== undefined) {
          return body;
        }
      }
      // If we've gone through all records and haven't returned, no matching question was found
      return "No matching question found"
    } else {
      return "No records found for the given day";
    }
  } catch (error) {
    console.error('Error in findQuestion:', error);
    // //throw error;
  }
};


const findLastMsg = async (number) => {

  try {
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

    const params = new URLSearchParams({
      filterByFormula: `({Phone} = "${number}")`,
      view: 'Grid view'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return undefined;
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      const lastMsg = data.records[0].fields.Last_Msg;
      // console.log("Last msg of " + number, lastMsg);
      return lastMsg !== undefined ? lastMsg : undefined;
    }

    return undefined;

  } catch (error) {
    console.error('Error in findLastMsg:', error);
    return undefined;
  }
};



const find_ContentField = async (field, currentDay, current_module, number) => {
 
  try {
    // First, get the course table name
    const course_tn = await findTable(number);

    const url = `https://api.airtable.com/v0/${baseId}/${course_tn}`;

    const params = new URLSearchParams({
      filterByFormula: `({Day} = ${currentDay})`,
      view: 'Grid view'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return 0;
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      for (const record of data.records) {
        const fieldName = `Module ${current_module} ${field}`;
        const body = record.fields[fieldName];

        if (body !== undefined) {
          // console.log("Feedback  " + number, body);
          return body.split("\n");
        }
      }
    }

    console.log("Feedback  0");
    return 0;

  } catch (error) {
    console.error('Error in find_ContentField:', error);
    return 0;
  }
};

const findField = async (field, number) => {
 
  try {
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

    const params = new URLSearchParams({
      filterByFormula: `({Phone} = "${number}")`,
      view: 'Grid view'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return 0;
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      const body = data.records[0].fields[field];
      return body !== undefined ? body : 0;
    }

    return 0;

  } catch (error) {
    console.error('Error in findField:', error);
    return 0;
  }
};

const findAns = async (currentDay, module_no, number) => {

  try {
    // First, get the course table name
    const course_tn = await findTable(number);

    const url = `https://api.airtable.com/v0/${baseId}/${course_tn}`;

    const params = new URLSearchParams({
      filterByFormula: `({Day} = ${currentDay})`,
      view: 'Grid view'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      const ansField = `Module ${module_no} Ans`;
      const body = data.records[0].fields[ansField];
      return body !== undefined ? body : null;
    }

    return null;

  } catch (error) {
    console.error('Error in findAns:', error);
    return null;
  }
};

// async function test() {
//   try {
//     // const id = await getID("918779171731")
//     let rec = await findField("Course", "918779171731")
//     console.log("Rec ", rec)

//     // console.log('Found ID:', id);
//   } catch (error) {
//     console.error('Error in test function:', error);
//   }
// }

// // Run the test
// test();

module.exports = {
  findTable,
  totalDays,
  updateField,
  findRecord,
  findTitle,
  findInteractive,
  findQuestion,
  findQuesRecord,
  getID,
  findLastMsg,
  findField,
  findAns,
  find_ContentField
};
