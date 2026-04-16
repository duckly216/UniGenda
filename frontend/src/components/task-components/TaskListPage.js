// This is a whole webpage dedicated to displaying a user's ENTIRE list of tasks
// For simplicity, we will not implement pagination or filtering here, but it can be added in the future
import React, { useState } from "react";
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";
import "../../styles/TaskRelatedStyles.css";

const TaskListPage = () => {
	const [refresh, setRefresh] = useState(0);
	const [showCreateTaskPopup, setShowCreateTaskPopup] = useState(false);

	const handleTaskAdded = () => {
		setRefresh((prev) => prev + 1);
		setShowCreateTaskPopup(false);
	};

	return (
		<div className="tasks-page">
			<div className="tasks-page-header">
				<h1>All Tasks</h1>
				<p>View and manage all your completed and uncompleted tasks.</p>
			</div>

			<section className="tasks-page-section">
				<button
					type="button"
					className="create-task-trigger"
					onClick={() => setShowCreateTaskPopup(true)}
				>
					Create New Task?
				</button>
			</section>

			<section className="tasks-page-section">
				<TaskList refreshTrigger={refresh} limit={null} showAllStatuses={true} />
			</section>

			{showCreateTaskPopup && (
				<div
					className="tasks-modal-overlay"
					onClick={() => setShowCreateTaskPopup(false)}
				>
					<div
						className="tasks-modal-content"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							className="tasks-modal-close"
							onClick={() => setShowCreateTaskPopup(false)}
						>
							✕
						</button>
						<TaskForm onTaskAdded={handleTaskAdded} />
					</div>
				</div>
			)}
		</div>
	);
};

export default TaskListPage;

