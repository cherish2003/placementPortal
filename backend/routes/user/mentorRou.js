const express = require('express')
const router = express.Router()
const md5 = require('md5');
var isemail = require('isemail');
var jwt = require('jsonwebtoken');
const { format } = require('date-fns')

// Models
const LogDet = require('../../models/user/LogDet');
const Student = require('../../models/user/Student');
const Parent = require('../../models/user/Parent');
const Mentor = require('../../models/user/Mentor');
const Att = require('../../models/user/Att')
const Schedule = require('../../models/user/Schedule')
const PlacementCompany = require('../../models/user/PlacementCompany')
const MentorReview = require('../../models/mentor/MentorReview')

//use
router.use(express.json());

router.get('/getStudents/:year', async (req, res) => {
    let token;
    const authHeader = req.headers["authorization"];
    if (authHeader !== undefined) {
        token = authHeader.split(" ")[1];
    }

    if (token) {
        const { username, role } = jwt.verify(token, 'qwertyuiop');
        if (role === "mentor") {
            //console.log(req.params.year)
            const studentList = await Student.find({ mentoremail: username, batch: req.params.year })
            res.json({
                success: true,
                data: { studentList }
            });
        }
    } else {
        res.json({
            success: false,
            error: 'error'
        });
    }
})

router.post('/getAtt', async (req, res) => {
    const { rollno } = req.body;
    const att1 = await Att.find({ rollno: { $in: rollno } })

    const groupedResults = {};
    att1.forEach((result) => {
        const rollno = result.rollno;
        const attendType = result.attentype.toLowerCase();
        const week = result.week;

        if (!groupedResults[rollno]) {
            groupedResults[rollno] = {};
        }

        if (!groupedResults[rollno][attendType]) {
            groupedResults[rollno][attendType] = {};
        }

        if (!groupedResults[rollno][attendType][week]) {
            groupedResults[rollno][attendType][week] = [];
        }

        groupedResults[rollno][attendType][week].push(result);
    });

    const att = { ...groupedResults }


    res.status(200).json({ data: att })
})

router.get('/getSchedule/:year', async (req, res) => {
    const { rollno } = req.body;
    const year = req.params.year;
    const schedule = await Schedule.find()

    res.status(200).json({ data: schedule })
})

router.get('/getPC', async (req, res) => {
    try {
        const visitedCompanies = await PlacementCompany.find({ arrival: 'visited', batch: '2019', });
        res.json({ success: true, data: visitedCompanies });
    } catch (error) {
        console.error(error);
    }
})

router.get('/getMentorReview/:email/:year', async (req, res) => {
    try {
        const { email, year } = req.params;
        const MR = await MentorReview.find({ mentoremail: email });
        res.json({ success: true, data: MR });
    } catch (error) {
        console.error(error);
    }
})

router.post('/uploadMFB', async (req, res) => {
    const { user, data } = req.body;
    //console.log(data.reviewtype === 'individual')
    if (data.reviewtype === 'individual') {
        try {
            const MFB = {
                "sno": "",
                "mentorname": user.name,
                "mentoremail": user.email,
                "mentordept": user.dept,
                "reviewtype": data.reviewtype,
                "rollno": data.rollno,
                "contactperson": data.person,
                "modeofcom": data.modeofcom,
                "menreview": data.menreview,
                "uploadeddate": format(new Date(), "yyyy-MM-dd"),
                "timestm": format(new Date(), "yyyy-MM-dd"),
            }
            const MR = await MentorReview.create(MFB);
            res.json({ success: true, data: MR });
        } catch (error) {
            console.error(error);
        }
    } else if (data.reviewtype === 'group') {
        try {
            const MFB = {
                "sno": "",
                "mentorname": user.name,
                "mentoremail": user.email,
                "mentordept": user.dept,
                "reviewtype": data.reviewtype,
                "rollno": data.reviewtype,
                "contactperson": data.menteesno,
                "modeofcom": data.modeofcom,
                "menreview": data.menreview,
                "uploadeddate": format(new Date(data['meeting-time']), "yyyy-MM-dd"),
                "timestm": new Date(),
            }
            const MR = await MentorReview.create(MFB);
            res.json({ success: true, data: MR });
            console.log(MR)
        } catch (error) {
            console.error(error);
        }
    }

})

router.put('/updateMFB', async (req, res) => {
    const { id, user, data } = req.body;
    //console.log(typeof (id), user, data)
    //console.log(data.reviewtype === 'individual')
    if (data.reviewtype === 'individual') {
        try {
            const MFB = {
                "mentorname": user.name,
                "mentoremail": user.email,
                "mentordept": user.dept,
                "reviewtype": data.reviewtype,
                "rollno": data.rollno,
                "contactperson": data.contactperson,
                "modeofcom": data.modeofcom,
                "menreview": data.menreview,
                "uploadeddate": data.uploadeddate,
            }
            const MR = await MentorReview.findOneAndUpdate({ _id: id }, MFB, { new: true });
            if (MR) { res.json({ success: true, data: MR }); }
            else res.status(404).json({ success: false, error: "Document not found" });

        } catch (error) {
            console.error(error);
        }
    } /* else if (data.reviewtype === 'group') {
        try {
            const MFB = {
                "sno": "",
                "mentorname": user.name,
                "mentoremail": user.email,
                "mentordept": user.dept,
                "reviewtype": data.reviewtype,
                "rollno": data.reviewtype,
                "contactperson": data.menteesno,
                "modeofcom": data.modeofcom,
                "menreview": data.menreview,
                "uploadeddate": format(new Date(data['meeting-time']), "yyyy-MM-dd"),
                "timestm": new Date(),
            }
            const MR = await MentorReview.create(MFB);
            res.json({ success: true, data: MR });
            console.log(MR)
        } catch (error) {
            console.error(error);
        }
    } */

})

router.get('/getCom/:year', async (req, res) => {
    let token;
    const authHeader = req.headers["authorization"];
    if (authHeader !== undefined) {
        token = authHeader.split(" ")[1];
    }

    if (token) {
        const { username, role } = jwt.verify(token, 'qwertyuiop');
        if (role === "mentor") {
            //console.log(req.params.year)
            const com = await PlacementCompany.find({ batch: req.params.year })
            res.json({
                success: true,
                data: com
            });
        }
    } else {
        res.json({
            success: false,
            error: 'error'
        });
    }
})

router.post('/upDet', async (req, res) => {
    let token;
    const authHeader = req.headers["authorization"];
    if (authHeader !== undefined) {
        token = authHeader.split(" ")[1];
    }
    //console.log(1)
    if (token) {
        const { username, role } = jwt.verify(token, 'qwertyuiop');
        //console.log(username, role)
        if (role === "mentor") {
            let q = await Mentor.findOneAndUpdate({ email: username }, {
                phoneno: req.body.phoneno,
                cabin: req.body.cabin,
                dept: req.body.dept,
            }, { new: true });
            res.json({
                success: true,
                data: q
            });
        }
    } else {
        res.json({
            success: false,
            error: 'error'
        });
    }
})

router.post('/chgnPwd', async (req, res) => {
    let token;
    const authHeader = req.headers["authorization"];
    if (authHeader !== undefined) {
        token = authHeader.split(" ")[1];
    }
    //console.log(1)
    if (token) {
        const { username, role } = jwt.verify(token, 'qwertyuiop');
        //console.log(username, role)
        if (role === "mentor") {
            let q = await LogDet.findOneAndUpdate({ username: username }, {
                password: md5(req.body.pass)
            }, { new: true });
            res.json({
                success: true,
                data: q
            });
        }
    } else {
        res.json({
            success: false,
            error: 'error'
        });
    }
})

router.get('/getYears', async (req, res) => {
    let token;
    const authHeader = req.headers["authorization"];
    if (authHeader !== undefined) {
        token = authHeader.split(" ")[1];
    }
    //console.log(1)
    if (token) {
        const { username, role } = jwt.verify(token, 'qwertyuiop');
        //console.log(username, role)
        try {
            if (role === 'mentor') {
                const batches = await Student.distinct('batch');
                res.json({ success: true, data: { batches } });
            } else {
                res.json({ success: false, error: 'auth failed' });
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.json({ success: false, error: 'auth failed' });
    }

});

module.exports = router;