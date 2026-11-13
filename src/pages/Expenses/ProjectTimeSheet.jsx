import React from "react";
import { useParams } from "react-router-dom";
import TimesheetDetailsPage from "./components/TimesheetDetailsPage";

const ProjectTimeSheet = () => {
  const { projectId } = useParams();
  return <TimesheetDetailsPage view="projects" entityId={projectId} />;
};

export default ProjectTimeSheet;