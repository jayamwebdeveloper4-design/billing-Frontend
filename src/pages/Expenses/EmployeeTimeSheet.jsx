import React from "react";
import { useParams } from "react-router-dom";
import TimesheetDetailsPage from "./components/TimesheetDetailsPage";

const EmployeeTimeSheet = () => {
  const { employeeId } = useParams();
  return <TimesheetDetailsPage view="employees" entityId={employeeId} />;
};

export default EmployeeTimeSheet;