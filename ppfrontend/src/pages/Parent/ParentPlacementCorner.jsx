import React, { useContext, useEffect, useState } from 'react'
import Sidebar from './components/ParentSidebar'
import AuthCon from '../../context/AuthPro'
import Table from 'react-bootstrap/Table';

export default function PlacementCorner() {
  const { user, auth } = useContext(AuthCon)
  const [company, setCompany] = useState();
  const [show, setShow] = useState(false);
  const [PP, setPP] = useState();

  async function fetchCompanies() {
    const response = await fetch(`http://localhost:3000/api/student/setComp/${user.batch}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth}`,
      },
    });
    const res = await response.json();
    //console.log([...res.data.comp]);
    setCompany([...res.data.comp]);
  }

  async function fetchStudentPlacementProgress() {
    const rollno = [user.rollno];
    const response = await fetch(`http://localhost:3000/api/mentor/getStudentPlacementProgress/${user.batch}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth}`,
      },
      body: JSON.stringify({ rollno }),
    });
    const res = await response.json();
    setPP(res.data);
    //console.log(res.data);
  }

  useEffect(() => {
    if (user) {
      fetchCompanies();
      fetchStudentPlacementProgress();
    }
  }, [user])

  useEffect(() => {
    if (company && user.rollno) {
      let userStageInfo = company.map(q => {
        const qq = Object.keys(q.stages).map((s, i) => {
          const qqq = q.stages[s].includes(user.rollno);
          if (qqq) q.currStage = s;
        })
        return qq
      });
      const filteredData = [];
      for (let item of userStageInfo) {
        for (let i of item) {
          if (i !== null && i !== undefined) {
            filteredData.push(i);
          }
        }
      }
      //console.log(11, company);
    }
  }, [company, user.rollno]);

  useEffect(() => {
    if (company) {
      var table = $('#PlacementCorner').DataTable({
        orderCellsTop: true, destroy: true,
        initComplete: function () {
          $('#PlacementCorner thead tr:eq(1) th.text_search').each(function () {
            var title = $(this).text();
            $(this).html(`<input type="text" placeholder=" ${title}" class="form-control column_search" />`);
          });

        }
      });
      $('#PlacementCorner thead').on('keyup', ".column_search", function () {
        table
          .column($(this).parent().index())
          .search(this.value)
          .draw();
      });
    }
  }, [company]);

  return (
    <div className='d-flex container-fluid'>
      <div className='me-4'>
        <Sidebar />
      </div>
      <div className='w-100'>
        <p className='fs-2 fw-bold'>PlacementCorner</p>
        {PP && <Table size="sm" striped bordered hover responsive>
          <thead>
            <tr className='text-center text-light fw-bold'>
              <th>Student</th>
              <th>CGPA</th>
              <th>Eligible Companies </th>
              <th>Applied Companies </th>
              <th>Shortlisted Companies </th>
              <th>Online Test</th>
              <th>GD</th>
              <th>Interview</th>
              <th>HR</th>
              <th>Other Stages</th>
              <th>Placed</th>
              <th>Placed Company</th>
              <th>Placed Company CTC</th>
            </tr>
          </thead>
          <tbody>
            {[user].map((q, i) => {
              return (
                <tr className="text-center" key={i}>
                  <th>{q.name}</th>
                  <th>CGPA</th>
                  <th>{PP.eligibleCompany[q.rollno]?.length || 0}</th>
                  <th>{PP.appliedCompany[q.rollno]?.length || 0}</th>
                  <th>{PP?.shortlistedCompany[q?.rollno]?.length || 0}</th>
                  <th>{PP.stages[q.rollno]?.ot?.length || 0}</th>
                  <th>{PP.stages[q.rollno]?.gd?.length || 0}</th>
                  <th>{PP.stages[q.rollno]?.inter?.length || 0}</th>
                  <th>{PP.stages[q.rollno]?.hr?.length || 0}</th>
                  <th>{PP.stages[q.rollno]?.other?.length || 0}</th>
                  <th>{PP.placed[q.rollno]?.[0] ? "Placed" : "Not Placed"}</th>
                  <th>{PP.placed[q.rollno]?.[0]?.name || "-"}</th>
                  <th>{PP.placed[q.rollno]?.[0]?.CTC || "-"}</th>
                </tr>
              );

            })}
          </tbody>
        </Table>}
        <button onClick={() => { setShow(!show) }} className='btn btn-primary mb-3'>Toggle to Show more Info</button>
        <div hidden={!show}>
          <Table id="PlacementCorner" className='w-100' striped bordered hover size='sm'>
            <thead>
              <tr className='text-center text-light fw-bold'>
                <th>#</th>
                <th> Name </th>
                <th> Job Role </th>
                <th> CTC </th>
                <th> Category</th>
                <th>Is Eligible</th>
                <th>Is Applied</th>
                <th>Is Shortlisted</th>
                <th>Mode Of Drive</th>
                <th>At Stages</th>
              </tr>
              <tr className='text-center text-light fw-bold'>
                <th className='text_search'>#</th>
                <th className='text_search'> Name </th>
                <th className='text_search'> Job Role </th>
                <th className='text_search'> CTC </th>
                <th className='text_search'> Category</th>
                <th className='text_search'>Is Eligible</th>
                <th className='text_search'>Is Applied</th>
                <th className='text_search'>Is Shortlisted</th>
                <th className='text_search'>Mode Of Drive</th>
                <th className='text_search'>At Stages</th>
              </tr>
            </thead>
            <tbody>
              {company && company.map((q, i) => {
                return <tr className='text-center' key={i}>
                  <th>{i + 1}</th>
                  <th>{q.name}</th>
                  <th>{q.jodRole}</th>
                  <th>{q.CTC}</th>
                  <th>{q.category}</th>
                  <th>{q.eligibleStudents.includes(user.rollno) ? "Yes" : "No"}</th>
                  <th>{q.appliedStudents.includes(user.rollno) ? "Yes" : "No"}</th>
                  <th>{q.shortlistedStudents.includes(user.rollno) ? "Yes" : "No"}</th>
                  <th>{q.modeOfDrive}</th>
                  <th>{q.currStage ? q.currStage : 'Not Applied or Eligible'}</th>
                </tr>
              })
              }
            </tbody>
          </Table>
        </div>

      </div>
    </div>
  )
}
