import React, { useContext, useState, useEffect, useRef } from 'react';
import Button from 'react-bootstrap/Button';
import Accordion from 'react-bootstrap/Accordion';
import AuthCon from '../../context/AuthPro';
import Sidebar from './components/Sidebar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import AdminCon from '../../context/AdminPro'
import { Toast } from 'primereact/toast';
import { MultiSelect } from 'primereact/multiselect';
import { FloatLabel } from 'primereact/floatlabel';
import { Tooltip } from 'primereact/tooltip';
import { format } from 'date-fns';

export default function Students() {
  const { auth } = useContext(AuthCon);
  const [file, setFile] = useState(null);
  const [jsonData, setJsonData] = useState();
  const { stu, year, setStu } = useContext(AdminCon)
  const [visibleColumns, setVisibleColumns] = useState([]);
  const dt = useRef(null);
  const toast = useRef(null);
  const baseURL = process.env.BASE_URL

  const columns = [
    { field: 'personalemail', header: 'personalemail' },
    { field: 'residence', header: 'residence' },
    { field: 'address', header: 'address' },
    { field: 'leetcode', header: 'leetcode' },
    { field: 'codechef', header: 'codechef' },
    { field: 'hackerrank', header: 'hackerrank' },
    { field: 'crcs', header: 'crcs' },
    { field: 'parentname', header: 'parentname' },
    { field: 'parentemail', header: 'parentemail' },
    { field: 'parentphone', header: 'parentphone' },
    { field: 'enrollmentstatus', header: 'enrollmentstatus' },
    { field: '10', header: '10' },
    { field: '12', header: '12' },
  ];


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${baseURL}/admin/addAttBulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const res = await response.json();
      setJsonData(res.data.jsonData);
      jsonData.map(q => {
        toast.current.show({ severity: 'info', summary: 'Attendence added', detail: `${q.rollno.length} students attendence added to ${q.name} for date ${q.date}`, life: 3000 });
      })
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const textEditor = (options) => {
    return <InputText type="text" value={options.value} onChange={(e) => options.editorCallback(e.target.value)} />;
  };

  const onRowEditComplete = async (e) => {
    console.log(11);
    let _products = [...stu];
    let { newData, index } = e;

    _products[index] = newData;
    console.log(newData);
    setStu(_products);
    toast.current.show({ severity: 'success', summary: 'Student Info updated', detail: newData.name, life: 3000 });

    const response = await fetch(`${baseURL}/admin/editStu`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stu: newData }),
    });

    const res = response.json();
    console.log(res.data);
  };

  const allowEdit = (rowData) => {
    return true;
  };

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;
    let orderedSelectedColumns = columns.filter((col) => selectedColumns.some((sCol) => sCol.field === col.field));
    setVisibleColumns(orderedSelectedColumns);
  };

  const exportExcel = () => {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(stu);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      });

      saveAsExcelFile(excelBuffer, 'Students');
    });
  };

  const saveAsExcelFile = (buffer, fileName) => {
    import('file-saver').then((module) => {
      if (module && module.default) {
        let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const data = new Blob([buffer], {
          type: EXCEL_TYPE
        });
        const fileName = 'Students';
        const EXCEL_EXTENSION = '.xlsx';
        const formattedDate = format(new Date(), 'dd-MM-yyyy_hh:mm');
        module.default.saveAs(data, `${fileName}_export_${formattedDate}${EXCEL_EXTENSION}`);
      }
    });
  };

  const header = <div className="d-flex justify-content-between align-items-center  gap-2">
    <FloatLabel className="mt-3"><MultiSelect value={visibleColumns} options={columns} optionLabel="header" onChange={onColumnToggle} className="w-full sm:w-100rem" filter style={{ minWidth: "300px" }} display="chip" /> <label htmlFor="ms-cities">Select Columns</label></FloatLabel>
    <Button type="button" onClick={exportExcel} data-pr-tooltip="XLS" ><i className="bi bi-file-earmark-spreadsheet"></i> Export into Excel</Button>
  </div>;


  return (
    <div>
      <div className='d-flex'>
        <div>
          <Sidebar />
        </div>
        <div className='ms-3 me-3 container w-100'>
          <h1>Attendence Management Portal</h1>
          <form onSubmit={handleSubmit}>
            <div className="mb-3 d-flex column-gap-3 align-items-center">
              <label htmlFor="formFile" className="form-label">Upload file here to add students</label>
              {jsonData && console.log(jsonData)}
              <div className='flex-fill'>
                <input className="form-control" type="file" id="formFile" onChange={handleFileChange} accept=".xlsx, .xls" />
              </div>
              <Button type="submit" className="">Upload</Button>
            </div>
          </form>
          <div>
            <Toast ref={toast} />
          </div>
        </div>
      </div>
      {stu && <div className='mt-3 container-fluid'>
        <Toast ref={toast} />
        <Tooltip target=".export-buttons>button" position="bottom" />
      </div>}
    </div>
  );
}
