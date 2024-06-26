const express = require('express')
const router = express.Router()
const md5 = require('md5');
var isemail = require('isemail');
var jwt = require('jsonwebtoken');
const { format } = require('date-fns')
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelJS = require('exceljs');

const upload = multer({ dest: 'uploads/' });

// Models 
const LogDet = require('../../models/user/LogDet');
const Student2 = require('../../models/user/Student1');
const Student = require('../../models/user/Student');
const Parent = require('../../models/user/Parent');
const Mentor = require('../../models/user/Mentor');
const Att = require('../../models/user/Att')
const Schedule = require('../../models/user/Schedule')
const PlacementCompany = require('../../models/user/PlacementCompany')
const MentorReview = require('../../models/mentor/MentorReview')
const Event = require('../../models/user/Event');
const PlacementCorner = require('../../models/user/PlacementCorner');
const Ann = require('../../models/admin/Ann');

//use
router.use(express.json());

let attToken = '';

function isEventExpired(event) {
  const currentTime = new Date();
  const endTime = new Date(event.endTime);

  if (event.rec === "once") return currentTime > endTime;
}

function isEventHappening(event) {
  const currentTime = new Date(); // Get the current time
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  if (event.rec === "once") {
    return currentTime >= startTime && currentTime <= endTime;
  } else if (event.rec === "daily") {
    const todayStartTime = new Date(startTime);
    todayStartTime.setFullYear(currentTime.getFullYear());
    todayStartTime.setMonth(currentTime.getMonth());
    todayStartTime.setDate(currentTime.getDate());

    const todayEndTime = new Date(endTime);
    todayEndTime.setFullYear(currentTime.getFullYear());
    todayEndTime.setMonth(currentTime.getMonth());
    todayEndTime.setDate(currentTime.getDate());

    return currentTime >= todayStartTime && currentTime <= todayEndTime;
  } else if (event.rec === "weekly") {
    const eventDay = startTime.getDay();
    const currentDay = currentTime.getDay();
    if (eventDay !== currentDay) {
      return false;
    }
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    throw new Error("Invalid recurrence type");
  }
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  attToken = result;
  return result;
}

router.get('/getEvents', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }

  if (token) {
    try {
      const { username, role } = jwt.verify(token, 'qwertyuiop');
      //console.log(role);
      if (role === "admin" || role === 'coor') {
        let q = await Event.find({});
        const eventsWithExpiration = q.map(event => ({
          ...event.toObject(),
          isExp: isEventExpired(event),
          isHap: isEventHappening(event)
        }));
        res.json({
          success: true,
          data: eventsWithExpiration
        });
      } else {
        res.json({
          success: false,
          error: 'wrong role'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: 'invalid token'
      });
    }
  } else {
    res.json({
      success: false,
      error: 'missing token'
    });
  }
});

/* router.get('/getRandomValue', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }
  if (token) {
    try {
      const { username, role } = jwt.verify(token, 'qwertyuiop');
      if (role === "admin" || role === "coor") {
        const randomValue = generateRandomString(50);
        attToken = randomValue;
        res.json({
          success: true,
          data: { randomValue }
        });
      } else {
        res.status(403).json({
          success: false,
          error: 'wrong role'
        });
      }
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'invalid token'
      });
    }
  } else {
    res.status(400).json({
      success: false,
      error: 'missing token'
    });
  }
}); */

function generateTokens(classId) {
  const Sessiontokens = [];
  const currentTime = Math.floor(Date.now() / 1000);

  for (let i = 0; i < 10; i++) {
    const token = jwt.sign({ classId, validUntil: currentTime + (i + 1) * 6 }, 'qwertyuiop', { expiresIn: (i + 1) * 6 });
    Sessiontokens.push(token);
  }
  return Sessiontokens;
}

router.post("/startQrSession", (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) return res.status(400).json({ success: false, message: "Session ID is required" });

  try {
    const tokens = generateTokens(sessionId);
    //console.log(tokens);
    res.json({ success: true, data: { tokens } });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to generate tokens" });
  }
});

router.get('/getEvent/:eid', async (req, res) => {
  let token;
  const { eid } = req.params;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }

  if (token) {
    try {
      const { username, role } = jwt.verify(token, 'qwertyuiop');
      if (role === "admin" || role === "coor") {
        let q = await Event.find({ _id: eid });

        const eventsWithExpiration = q.map(event => ({
          ...event.toObject(),
          isExp: isEventExpired(event),
          isHap: isEventHappening(event)
        }));
        res.json({
          success: true,
          data: eventsWithExpiration
        });
      } else {
        res.json({
          success: false,
          error: 'wrong role'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: 'invalid token'
      });
    }
  } else {
    res.json({
      success: false,
      error: 'missing token'
    });
  }
});

router.post('/postEvent', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }

  if (token) {
    const { username, role } = jwt.verify(token, 'qwertyuiop');

    if (role === "admin") {
      //console.log(req.body.data);
      let q = await Event.create({ ...req.body.data, attendance: {} })

      res.json({
        success: true,
        data: q
      });

    } else {
      res.json({
        success: false,
        error: 'wrong role'
      });
    }

  } else {
    res.json({
      success: false,
      error: 'wrong token'
    });
  }
})

router.delete('/deleteEvent/:id', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }

  if (token) {
    const { username, role } = jwt.verify(token, 'qwertyuiop');
    if (role === "admin") {
      const { id } = req.params;
      let q = await Event.findOneAndDelete({ _id: id })
      //console.log(id);
      res.json({
        success: true,
        data: q
      });

    } else {
      res.json({
        success: false,
        error: 'wrong role'
      });
    }

  } else {
    res.json({
      success: false,
      error: 'wrong token'
    });
  }
})

router.put('/putEvent', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }

  if (token) {
    const { username, role } = jwt.verify(token, 'qwertyuiop');

    if (role === "admin") {
      //console.log(11, req.body.data);
      let q = await Event.findByIdAndUpdate({ _id: req.body.data._id }, req.body.data, { new: true })

      res.json({
        success: true,
        data: q
      });

    } else {
      res.json({
        success: false,
        error: 'wrong role'
      });
    }

  } else {
    res.json({
      success: false,
      error: 'wrong token'
    });
  }
})

router.post('/addStu', upload.single('file'), async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }
  try {
    if (token) {
      const { username, role } = jwt.verify(token, 'qwertyuiop');

      if (role === "admin") {
        try {
          const file = req.file;
          if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
          }

          const workbook = xlsx.readFile(file.path);
          const sheet_name_list = workbook.SheetNames;
          const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
          //console.log(jsonData[0]);
          const parentAccounts = [];
          for (let i of jsonData) {
            const studentExists = await Student.findOne({ rollno: i.rollno });
            if (!studentExists) {
              await Student.create({ ...i, yearofpassing: i['year of passing'] });
            }
            const logExists = await LogDet.findOne({ username: i.rollno });

            if (!logExists) {
              const q = { username: i.rollno, password: md5(i.rollno), role: "student" };
              let rand = Math.floor(Math.random() * 1000000) + 1;
              console.log(rand);
              let p = { username: `${i.rollno}_parent`, password: md5(rand), role: "parent" };
              await LogDet.create(q);
              let pp = await LogDet.create(p);
              parentAccounts.push({ ...p, password: rand });
            }
          }
          res.json({ success: true, data: jsonData });

          fs.writeFile('parentDet.json', JSON.stringify(parentAccounts, null, 2), (err) => {
            if (err) {
              console.error("Error writing file:", err);
            } else {
              console.log(`File has been saved as 'parentDet.json'`);
            }
          });

          fs.unlink(file.path, (err) => {
            if (err) {
              console.error('Error deleting the file:', err);
            } else {
              //console.log('Uploaded file deleted successfully');
            }
          });

        } catch (error) {
          console.error('Error processing file:', error);
          res.status(500).json({ success: false, error: 'Error processing file' });
        }

      } else {
        res.json({
          success: false,
          error: 'wrong role'
        });
      }

    } else {
      res.json({
        success: false,
        error: 'wrong token'
      });
    }
  } catch (e) {
    res.json({
      success: false,
      error: 'internal error'
    });
  }

});

router.post('/editStu', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  try {
    if (authHeader !== undefined) token = authHeader.split(" ")[1];

    if (token) {
      const { username, role } = jwt.verify(token, 'qwertyuiop');
      if (role === "admin") {
        const stu = req.body.stu;
        let s = await Student2.findOneAndUpdate({ _id: stu._id }, { ...stu }, { new: true })
        //console.log(1, stu._id, s);
        res.json({ success: true, data: { stu: s } })
      } else {
        res.json({ success: false, error: 'wrong role' });
      }
    } else {
      res.json({ success: false, error: 'wrong token' });
    }
  } catch (e) { res.json({ success: false, error: 'internal error' }); }

});

router.get('/getStu/:year', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }
  try {
    if (token) {
      const { username, role } = jwt.verify(token, 'qwertyuiop');
      if (role === "admin") {
        const year = parseInt(req.params.year, 10);
        //console.log(year, typeof (year));
        const stu = await Student.find({ yearofpassing: year });
        res.json({
          success: true,
          data: { stu },
        });

      } else {
        res.json({
          success: false,
          error: 'wrong role'
        });
      }

    } else {
      res.json({
        success: false,
        error: 'wrong token'
      });
    }
  } catch (e) {
    res.json({
      success: false,
      error: 'internal error'
    });
  }

});

router.get('/getYears', async (req, res) => {
  try {
    //console.log(11);
    const distinctYears = await Student.distinct('yearofpassing');
    //console.log(distinctYears);
    res.json({ success: true, data: { years: distinctYears } });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.post('/postMentorThroughEmail', async (req, res) => {
  let q = req.body.emails
  //console.log(q);
  for (let i of q) {
    let mentorExists = await Mentor.findOne({ where: { email: i } });

    if (!mentorExists) {
      await Mentor.create({
        "name": "",
        "email": i,
        "cabin": "",
        "dept": "",
        "phoneno": "",
        "role": "mentor"
      });

      await LogDet2.create({
        "username": i,
        "password": md5(i),
        "role": "mentor",
      });
    }
  }
  res.json({ success: true, data: { q } })
})

const xlsxToJson = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const allSheetsData = [];
  workbook.eachSheet(sheet => {
    const headerRow = sheet.getRow(1);
    const headers = headerRow.values.map(value => value.toString().trim());

    const jsonData = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index).value;
      });
      jsonData.push(rowData);
    });

    allSheetsData.push(...jsonData);
  });

  return allSheetsData;
};

router.post("/markAtt", async (req, res) => {
  const { qr_data, rollno } = req.body;
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }

  if (token) {
    try {
      const sessionId = jwt.verify(qr_data, "qwertyuiop");
      const { classId } = sessionId;
      const CurrEvt = await Event.findById(classId);

      if (!CurrEvt) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      const today = new Date().toLocaleDateString("en-GB").split("/").join("-");
      if (!CurrEvt.attendance[today]) {
        CurrEvt.attendance[today] = [];
      } else if (CurrEvt.attendance[today].includes(rollno)) {
        return res.status(201).json({
          success: false,
          message: "Duplicate attendance found",
        });
      }
      CurrEvt.attendance[today].push(rollno);

      await Event.findByIdAndUpdate(
        classId,
        { attendance: CurrEvt.attendance },
        { new: true }
      );

      return res.json({
        success: true,
        data: { message: "Attendance marked successfully" },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "QR verification failed",
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "Authorization token is missing or invalid",
    });
  }
});


router.post("/submitStdAtt", async (req, res) => {
  const { roll_numbers, sessionid } = req.body;
  //console.log(roll_numbers, sessionid);

  if (!roll_numbers || !sessionid) {
    return res.status(400).json({
      success: false,
      message: "Roll numbers and session ID are required",
    });
  }

  try {
    const CurrEvt = await Event.findById(sessionid);

    if (!CurrEvt) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const today = new Date().toLocaleDateString("en-GB").split("/").join("-");

    if (!CurrEvt.attendance[today]) {
      CurrEvt.attendance[today] = [];
    }

    CurrEvt.attendance[today] = [...CurrEvt.attendance[today], ...roll_numbers];

    await Event.findByIdAndUpdate(
      sessionid,
      { attendance: CurrEvt.attendance },
      { new: true }
    );

    return res.json({
      success: true,
      data: { message: "Attendance marked successfully" },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit attendance",
    });
  }
});

router.post('/addCompBulk', upload.single('file'), async (req, res) => {
  try {
    // Check if token is provided in the request headers
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Authorization token not provided' });
    }
    const token = authHeader.split(" ")[1];

    // Verify the token and extract username and role
    const { username, role } = jwt.verify(token, 'qwertyuiop');

    // Check if the role is 'admin'
    if (role !== "admin") {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    // Check if a file is uploaded
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Read the uploaded Excel file and convert it to JSON
    const jsonData = await xlsxToJson(file.path);

    // Process the JSON data (if needed)
    jsonData.forEach(q => {
      ['eligibleStudents', 'appliedStudents', 'shortlistedStudents', 'onlineTest', 'GD', 'interview1', 'interview2', 'interview3', 'HR', 'otherStages', 'placedStudents'].forEach(h => {
        if (typeof q[h] === 'string') {
          q[h] = q[h].split('\n').map(item => item.trim()).filter(item => item !== '');
        }
      });

      if (typeof q.branches === 'string') {
        q.branches = q.branches.split(',').map(item => item.trim()).filter(item => item !== '');
      }
    });

    let comp = [];

    jsonData.map(async q => {
      stages = {
        "onlineTest": {},
        "GD": {},
        "interview1": {},
        "interview2": {},
        "interview3": {},
        "HR": {},
        "otherStages": {}
      }

      let valid = Object.keys(stages).map(s => { return q[s] !== null && s }).filter(stage => stage !== false)
      //console.log(q.name, valid[0], 'valid', valid);

      if (valid.length !== 0) {
        for (let i of q.shortlistedStudents) {
          if (q[valid[0]].includes(i)) {
            stages[valid[0]][i] = 'cleared'
          } else {
            stages[valid[0]][i] = 'not cleared'
          }
        }

        for (let i = 1; i < valid.length; i++) {
          //console.log(q.name);
          for (let r of q[valid[i - 1]]) {
            if (q[valid[i]].includes(r)) {
              stages[valid[i]][r] = 'cleared'
            } else {
              stages[valid[i]][r] = 'not cleared'
            }
          }
        }
      }

      //console.log(q.name, valid[0], q[valid[0]], stages);

      Object.keys(stages).map(s => {
        if (!(valid.includes(s))) {
          stages[s] = 'not applicable'
        }
        if (Object.keys(stages[s]).length === 0) {
          stages[s] = 'not applicable'
        }
      })
      q.stages = stages
      //console.log(q.name, stages);
      //console.log(q.name, 'stages', stages); 

      if (await PlacementCorner.findOne({ name: q.name })) {
        let updatedDocument = await PlacementCorner.findOneAndUpdate({ name: q.name }, { ...q }, { new: true });
        comp.push(updatedDocument);
      } else {
        let newDocument = await PlacementCorner.create({ ...q, stages, stuFeed: {} });
        comp.push(newDocument);
      }
    })

    res.json({ success: true, data: { comp, jsonData } });

    fs.unlink(file.path, (err) => {
      if (err) {
        console.error('Error deleting the file:', err);
      } else {
        //console.log('Uploaded file deleted successfully');
      }
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ success: false, error: 'Error processing file' });
  }
});

router.post('/addAttBulk', upload.single('file'), async (req, res) => {
  try {
    // Check if token is provided in the request headers
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Authorization token not provided' });
    }
    const token = authHeader.split(" ")[1];

    // Verify the token and extract username and role
    const { username, role } = jwt.verify(token, 'qwertyuiop');

    // Check if the role is 'admin'
    if (role !== "admin") {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const jsonData = await xlsxToJson(file.path);

    jsonData.map(async eve => {
      try {
        eve.date = format(new Date(eve.date), 'dd-MM-yyyy');
        eve.rollno = eve.rollno.split('\n').map(rollno => rollno.trim());
        let curr = await Event.findOne({ name: eve.name });

        if (curr) {
          if (!curr.attendance) {
            curr.attendance = {};
          }
          if (curr.attendance[eve.date]) {
            curr.attendance[eve.date] = Array.from(new Set(curr.attendance[eve.date].concat(eve.rollno)));
          } else {
            curr.attendance[eve.date] = eve.rollno;
          }
          await Event.findOneAndUpdate({ name: eve.name }, { attendance: curr.attendance }, { new: true });
          //console.log(`Attendance updated for event: ${eve.name}`);
        } else {
          console.log(`Event not found: ${eve.name}`);
        }
      } catch (error) {
        console.error(`Error updating attendance for event: ${eve.name}`, error);
      }
    });

    res.json({ success: true, data: { jsonData } });

    fs.unlink(file.path, (err) => {
      if (err) {
        console.error('Error deleting the file:', err);
      } else {
        //console.log('Uploaded file deleted successfully');
      }
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ success: false, error: 'Error processing file' });
  }
});

router.post('/addTests', async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.json({ success: false, error: 'Authorization token not provided' });
    }
    const token = authHeader.split(" ")[1];

    const { username, role } = jwt.verify(token, 'qwertyuiop');

    if (role !== "admin") {
      return res.json({ success: false, error: 'Insufficient permissions' });
    }
    console.log('addTests', req.body.tests);
    const { tests } = req.body;

    let q = tests.map(async t => {
      return await Schedule.create(t)
    })

    return res.json({ success: true, data: { tests: q } })


  } catch (error) {
    console.error('Error processing file:', error);
    return res.json({ success: false, error: 'Error processing file' });
  }
});

router.post('/postTest', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) token = authHeader.split(" ")[1];
  if (token) {
    const { username, role } = jwt.verify(token, 'qwertyuiop');
    if (role === "admin") {
      let q = await Schedule.create({ ...req.body.data, marks: {} })
      return res.json({ success: true, data: { tests: q } });
    } else {
      return res.json({ success: false, error: 'wrong role' });
    }
  } else {
    return res.json({ success: false, error: 'wrong token' });
  }
})

router.get('/getTests/:year', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) token = authHeader.split(" ")[1];

  if (token) {
    const { username, role } = jwt.verify(token, 'qwertyuiop');
    if (role === "admin") {
      const { year } = req.params; console.log(year);
      let q = await Schedule.find({ batch: year })
      return res.json({ success: true, data: { tests: q } });
    } else {
      return res.json({ success: false, error: 'wrong role' });
    }
  } else {
    return res.json({ success: false, error: 'wrong token' });
  }
})

router.put('/putTest', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) token = authHeader.split(" ")[1];
  if (token) {
    const { username, role } = jwt.verify(token, 'qwertyuiop');
    if (role === "admin") {
      let q = await Schedule.findOneAndUpdate({}, { ...req.body.data, marks: {} }, { new: true })
      return res.json({ success: true, data: { tests: q } });
    } else {
      return res.json({ success: false, error: 'wrong role' });
    }
  } else {
    return res.json({ success: false, error: 'wrong token' });
  }
})

router.get('/getAnn/:year', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) token = authHeader.split(" ")[1];
  if (token) {
    const { username, role } = jwt.verify(token, 'qwertyuiop');
    if (role === "admin") {
      let q = await Ann.find({ batch: req.params.year })
      return res.json({ success: true, data: { ann: q } });
    } else {
      return res.json({ success: false, error: 'wrong role' });
    }
  } else {
    return res.json({ success: false, error: 'wrong token' });
  }
})

router.post('/postAnn', async (req, res) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) token = authHeader.split(" ")[1];
  if (token) {
    const { username, role } = jwt.verify(token, 'qwertyuiop');
    if (role === "admin") {
      console.log(req.body);
      let q = await Ann.create({ ...req.body })
      return res.json({ success: true, data: { ann: q } });
    } else {
      return res.json({ success: false, error: 'wrong role' });
    }
  } else {
    return res.json({ success: false, error: 'wrong token' });
  }
})


module.exports = router;