import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import axios from "axios";
import "../styles/Calendar.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Calendar = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const response = await axios.get(
            `http://127.0.0.1:5000/tasks/${user.uid}?limit=100`,
          );
          setTasks(response.data);
        } catch (err) {
          console.error("Error fetching tasks:", err);
        }
      }
    };
    fetchTasks();
  }, []);

  const today = new Date();
  const [current, setCurrent] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

  const prevMonth = () => {
    setCurrent(({ month, year }) =>
      month === 0 ? { month: 11, year: year - 1 } : { month: month - 1, year },
    );
  };

  const nextMonth = () => {
    setCurrent(({ month, year }) =>
      month === 11 ? { month: 0, year: year + 1 } : { month: month + 1, year },
    );
  };

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const monthName = new Date(current.year, current.month).toLocaleString(
    "default",
    { month: "long" },
  );

  const tasksByDate = {};
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    if (!tasksByDate[task.dueDate]) tasksByDate[task.dueDate] = [];
    tasksByDate[task.dueDate].push(task);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div className="calendar-page">
      <div className="calendar">
        <div className="calendar-header">
          <button className="cal-arrow" onClick={prevMonth}>
            ‹
          </button>
          <h2 className="calendar-title">
            {monthName} {current.year}
          </h2>
          <button className="cal-arrow" onClick={nextMonth}>
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="calendar-dow">
              {d}
            </div>
          ))}

          {cells.map((day, i) => {
            if (!day)
              return <div key={`empty-${i}`} className="calendar-cell empty" />;

            const dateStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTasks = tasksByDate[dateStr] || [];
            const isToday =
              day === today.getDate() &&
              current.month === today.getMonth() &&
              current.year === today.getFullYear();

            return (
              <div
                key={dateStr}
                className={`calendar-cell ${isToday ? "today" : ""}`}
              >
                <span className="calendar-day-number">{day}</span>
                <div className="calendar-tasks">
                  {dayTasks.map((task, idx) => (
                    <div key={idx} className="calendar-task-pill">
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
