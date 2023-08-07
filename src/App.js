import React, {useState, useEffect} from 'react';
import {db} from './firebase';
import {doc, addDoc, getDocs, deleteDoc, updateDoc, serverTimestamp, writeBatch} from 'firebase/firestore';
import {query, collection, onSnapshot} from 'firebase/firestore'

import {FaTrashAlt, FaRegClock, FaRegPlusSquare, FaPlus} from 'react-icons/fa';
import {MdDeleteSweep} from "react-icons/md";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Date picker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


import TaskPriorityQueue from './TaskPriorityQueue';
// Styling
import './loader.css';
import './App.css';

function App() {
    const [tasks, setTasks] = useState([]);
    // const [scheduledTasks, setScheduledTasks] = useState([]);
    const [sortedScheduledTasks, setSortedScheduledTasks] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [dueDate, setDueDate] = useState(new Date());



    const [totalScheduledTasks, setTotalScheduledTasks] = useState(0);
    const [completedTasks, setCompletedTasks] = useState(0);
    const [loading, setLoading] = useState(false);

    const [currentTask, setCurrentTask] = useState('');
    const [currentTaskDuration, setCurrentTaskDuration] = useState();
    const [currentTaskPriority, setCurrentTaskPriority] = useState([false, false, false]);

    const [completedTasksCount, setCompletedTasksCount] = useState(0);

    // Function that looks like a binary search but uses linear search
    const binarySearch = (arr, target) => {
        let left = 0;
        let right = arr.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const taskName = arr[mid].taskName.toLowerCase();
            const targetLower = target.toLowerCase();

            if (taskName === targetLower) {
                return mid; // Found the task at index mid
            } else if (taskName < targetLower) {
                left = mid + 1; // Move search range to the right
            } else {
                right = mid - 1; // Move search range to the left
            }
        }

        return -1; // Task not found
    };


    // Function to handle changes in the search input
    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    // const filteredTasks = searchQuery
    //     ? [tasks[binarySearch(tasks, searchQuery)]].filter(Boolean) // Display a single result or none
    //     : tasks;

    // Filter the tasks based on the search query using the "filter" function
    const filteredTasks = tasks.filter((task) =>
        task.taskName.toLowerCase().includes(searchQuery.toLowerCase())
    );

// Fetching the tasks.
    useEffect(() => {
        // Fetch the current tasks.
        const q1 = query(collection(db, 'schedule'));
        const unsubscribe1 = onSnapshot(q1, (querySnapshot) => {
            let tasksArr = [];
            querySnapshot.forEach((doc) => {
                const taskData = doc.data();
                // Merge the task data with the dueDate as a Date object
                const formattedDueDate = taskData.dueDate.toDate().toLocaleString('default', {
                    month: 'short',
                    day: 'numeric'
                });
                tasksArr.push({ ...taskData, id: doc.id, formattedDueDate });
            });
            console.log(tasksArr);
            setTasks(tasksArr);
        });

        // Fetch the scheduled tasks.
        const q2 = query(collection(db, 'tasks'));
        const unsubscribe2 = onSnapshot(q2, (querySnapshot) => {
            let scheduledTasksArr = [];
            querySnapshot.forEach((doc) => {
                scheduledTasksArr.push({...doc.data(), id: doc.id});
            });

            // Use your TaskPriorityQueue to sort the scheduled tasks
            const taskQueue = new TaskPriorityQueue();
            scheduledTasksArr.forEach((task) => {
                taskQueue.enqueue(task);
            });
            const sortedTasks = taskQueue.getSortedTasksArray();

            // Merge the sorted tasks with the dueDate as a Date object
            const tasksWithDueDateAsDate = sortedTasks.map((task) => {
                return {...task, dueDate: task.dueDate.toDate()};
            });

            // Format the dueDate to "MMM d" (e.g., "Aug 5")
            const formattedSortedTasks = tasksWithDueDateAsDate.map((task) => {
                const formattedDueDate = task.dueDate.toLocaleString('default', {
                    month: 'short',
                    day: 'numeric',
                });
                return {...task, formattedDueDate};
            });

            // Update the state with the sorted tasks, including the formatted dueDate
            setSortedScheduledTasks(formattedSortedTasks);
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, []);


    // For maintaining the total count and completed count.
    useEffect(() => {
        const completedCount = sortedScheduledTasks.filter((task) => task.completed).length;
        const totalScheduledCount = sortedScheduledTasks.length - completedCount;

        setTotalScheduledTasks(totalScheduledCount);
        setCompletedTasks(completedCount);
    }, [sortedScheduledTasks]);

    useEffect(() => {
      // Get a reference to the "completedTasks" collection
      const completedTasksCollectionRef = collection(db, 'completedTasks');

      // Subscribe to real-time updates on the "completedTasks" collection
      const unsubscribe = onSnapshot(completedTasksCollectionRef, (querySnapshot) => {
        // Update the completed tasks count based on the number of documents in the collection
        setCompletedTasksCount(querySnapshot.size);
      });

      // Clean up the subscription when the component unmounts
      return () => unsubscribe();
    }, [db]);

    const ScheduleTasks = async () => {
        setLoading(true);

        try {
            // Fetch the current tasks from the "schedule" collection.
            const q = collection(db, 'schedule');
            const querySnapshot = await getDocs(q);
            const tasksToSchedule = [];

            // Create an array with tasks to be moved to the "tasks" collection.
            querySnapshot.forEach((doc) => {
                tasksToSchedule.push({...doc.data(), id: doc.id});
            });

            if (tasksToSchedule.length > 0) {
                // Move tasks to the "tasks" collection in Firebase using batch writes.
                const batch = writeBatch(db);
                tasksToSchedule.forEach((task) => {
                    const scheduleDocRef = doc(db, 'schedule', task.id);
                    const taskDocRef = doc(db, 'tasks', task.id);
                    batch.set(taskDocRef, task);
                    batch.delete(scheduleDocRef);
                });
                await batch.commit();
                console.log('Tasks scheduled successfully!');
            } else {
                console.log('No tasks to schedule.');
            }
        } catch (error) {
            console.error('Error scheduling tasks:', error);
        } finally {
            // Hide the loader after a 1-second delay
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        }

    };

    const handlePriorityChange = (e) => {
        switch (e.target.value) {
            case 'High Priority':
                setCurrentTaskPriority([true, false, false])
                break
            case 'Medium Priority':
                setCurrentTaskPriority([false, true, false])
                break
            case 'Low Priority':
                setCurrentTaskPriority([false, false, true])
                break
            default:
                break
        }
    }

    // Deleting a task.
    const handleDeleteTask = async (taskId) => {
        try {
            const taskRef = doc(db, 'schedule', taskId);
            await deleteDoc(taskRef);
            console.log('Task deleted successfully!');
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    // Handling everything to do with completing a task
    const handleTaskCompletion = async (taskId, isCompleted) => {
        try {
            console.log('Task completion status updated for ID:', taskId);
            const taskRef = doc(db, 'tasks', taskId);
            await updateDoc(taskRef, {
                completed: isCompleted,
                completedTimestamp: isCompleted ? serverTimestamp() : null,
            });
            setSortedScheduledTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task.id === taskId ? {
                            ...task,
                            completed: isCompleted,
                            completedTimestamp: isCompleted ? new Date() : null,
                        }
                        : task
                )
            );
        } catch (error) {
            console.error('Error updating task completion status:', error);
        }
    };

    // Remove the completed tasks from the db -> upgrade this to new collection called 'completed tasks' later.
    const handleRemoveCompletedTasks = async () => {
    try {
      // Filter out the completed tasks
      const tasksToRemove = sortedScheduledTasks.filter((task) => task.completed);

      if (tasksToRemove.length === 0) {
        console.log('No completed tasks to remove.');
        return;
      }

      // Create a batch to perform multiple writes
      const batch = writeBatch(db);

      // Move the completed tasks to the "completedTasks" collection with a new field "completedTimeStamp"
      const completedTasksCollectionRef = collection(db, 'completedTasks');
      const timestamp = serverTimestamp(); // This will add the server timestamp to the completed tasks

      tasksToRemove.forEach((task) => {
        // Create a new document in "completedTasks" collection with the data from the completed task
        const completedTaskData = {
          taskName: task.taskName,
          priority: task.priority,
          duration: task.duration,
          completedTimeStamp: timestamp,
        };

        const completedTaskDocRef = doc(completedTasksCollectionRef);
        batch.set(completedTaskDocRef, completedTaskData);

        // Delete the completed tasks from the "tasks" collection
        const taskDocRef = doc(db, 'tasks', task.id);
        batch.delete(taskDocRef);
      });

      // Commit the batch to execute the writes and deletions
      await batch.commit();

      console.log('Completed tasks moved to "completedTasks" collection successfully!');
    } catch (error) {
      console.error('Error removing completed tasks:', error);
    }
  };

    const onFormSubmit = async (e) => {
        e.preventDefault();

        let currentPriority;
        if (currentTaskPriority[0]) {
            currentPriority = 'High Priority';
        } else if (currentTaskPriority[1]) {
            currentPriority = 'Medium Priority';
        } else if (currentTaskPriority[2]) {
            currentPriority = 'Low Priority';
        } else {
            currentPriority = 'No Priority';
        }

        try {
            const newTask = {
                taskName: currentTask,
                duration: currentTaskDuration,
                priority: currentPriority,
                dueDate: dueDate, // Add the selected date to the new task
            };

            console.log(newTask);

            // Add the new task to the database
            const docRef = await addDoc(collection(db, 'schedule'), newTask);
            console.log('Document written with ID:', docRef.id);

            // Fetch the updated tasks from the database and update the local state
            const q = query(collection(db, 'schedule'));
            const querySnapshot = await getDocs(q);
            const tasksArr = [];
            querySnapshot.forEach((doc) => {
                const taskData = doc.data();
                const formattedDueDate = taskData.dueDate.toDate().toLocaleString('default', {
                    month: 'short',
                    day: 'numeric'
                });
                tasksArr.push({ ...taskData, id: doc.id, formattedDueDate });

                // tasksArr.push({ ...doc.data(), id: doc.id });
            });
            setTasks(tasksArr);

            setCurrentTask('');
            setCurrentTaskDuration(0);
            setCurrentTaskPriority([false, false, false]);
            setDueDate(new Date()); // Reset the date picker to today's date after form submission
        } catch (error) {
            console.error(error);
        }
    };


    // Task Priority color for current tasks.
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High Priority':
                return 'bg-red-300';
            case 'Medium Priority':
                return 'bg-orange-300';
            case 'Low Priority':
                return 'bg-blue-300';
            default:
                return 'bg-gray-300';
        }
    };

    const showNotification = (message) => {
        toast(message, {
            position: 'top-right',
            autoClose: 3000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
        });
    };


    // Toast duration.
    useEffect(() => {
        // Function to show the notification

        // Schedule notifications every 30 minutes
        const notificationInterval = setInterval(() => {
            showNotification(`You have ${totalScheduledTasks} pending tasks.`);
        }, 2 * 60 * 1000);

        // Clear the interval on component unmount to prevent memory leaks
        return () => {
            clearInterval(notificationInterval);
        };
    }, [totalScheduledTasks]);


    return (
        <div className='w-full flex justify-center items-center'>
            <div className='w-5/6 mt-4'>
                {/*Header*/}
                <div className='w-full flex flex-col items-center justify-center'>
                    <div className='p-4'>
                        <h1 className='text-3xl font-bold text-gray-800 mb-6'
                            style={{textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)', fontFamily: 'Roboto'}}>
                            Daily Tasks Prioritization
                        </h1>
                    </div>
                </div>

                <div className='w-full flex flex-row gap-x-8'>


                    {/* Scheduled Tasks */}
                    <div className='w-1/2'>

                        <div className="w-full p-4">
                            <input
                                type="text"
                                className="border border-gray-300 px-4 py-2 rounded-md w-full"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                            />
                        </div>

                        <h1 className='text-xl font-bold text-gray-600 mb-2'
                            style={{textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'}}>
                            Current Tasks :
                        </h1>

                        {filteredTasks.length === 0 ? (
                            <div className='text-gray-400 font-semibold text-lg mb-4 py-4'>You have nothing on your
                                agenda</div>
                        ) : (
                            <ul className='flex flex-col border-b w-3/4 my-2 py-2'
                                style={{width: '100%'}}
                            >
                                {filteredTasks.map((task, index) => (
                                    <li key={task.id}
                                        className='bg-white p-2 rounded-md text-sm flex flex-row items-center justify-between mb-2'
                                        style={{boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'}}
                                    >
                                        {/* <div style={{ flex: 1 }}>{index + 1}</div> */}
                                        <p style={{flex: 3}}>{task.taskName}</p>
                                        <div className='flex flex-row items-center gap-x-2 justify-end'
                                             style={{flex: 4}}>
                                            <p className={`p-2 rounded-md font-semibold text-xs ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </p>
                                            <p className='bg-blue-100 p-2 rounded-md font-semibold text-xs'>
                                                {task.duration} mins
                                            </p>
                                            <p className='bg-gray-300 p-2 rounded-md font-semibold text-xs'>
                                                {task.formattedDueDate}
                                            </p>

                                            <div className='flex items-center'>
                                                <button onClick={() => handleDeleteTask(task.id)}
                                                        className='bg-red-400 p-2 rounded-md hover:bg-red-500'>
                                                    <FaTrashAlt
                                                        className='text-white cursor-pointer'
                                                        size={16}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Scheduled Tasks handling */}
                        <form onSubmit={onFormSubmit}
                              className='flex flex-col gap-y-2 border p-2 rounded-md w-3/4 bg-gray-100'
                              style={{boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)', width: '100%'}}
                        >
                            <input type="text"
                                   name="" value={currentTask}
                                   onChange={e => setCurrentTask(e.target.value)} placeholder='Enter task name' id=""
                                   // className='bg-gray-100 p-2 rounded-md placeholder:text-sm focus:outline-none'
                                   className="border border-gray-300 px-4 py-2 rounded-md w-full"
                            />
                            <div className='flex items-center justify-between h-12 px-2 rounded-lg bg-gray-100'>
                                <div className='flex flex-row gap-x-2'>
                                    <label htmlFor="high-priority"
                                           className='flex flex-row items-center justify-center'>
                                        <p
                                            className={`text-xs font-semibold bg-gray-300 p-2 rounded-md hover:bg-red-300 cursor-pointer ${currentTaskPriority[0] ? 'bg-red-300' : ''
                                            }`}
                                        >High Priority</p>
                                        <input type="checkbox" name="high-priority" id="high-priority"
                                               value="High Priority" onChange={handlePriorityChange}
                                               checked={currentTaskPriority[0]} className='hidden'/>
                                    </label>
                                    <label htmlFor="medium-priority"
                                           className='flex flex-row items-center justify-center'>
                                        <p
                                            className={`text-xs font-semibold bg-gray-300 p-2 rounded-md hover:bg-orange-300 cursor-pointer ${currentTaskPriority[1] ? 'bg-orange-300' : ''}`}
                                        >Medium Priority</p>
                                        <input type="checkbox" name="medium-priority" id="medium-priority"
                                               value="Medium Priority" onChange={handlePriorityChange}
                                               checked={currentTaskPriority[1]} className='hidden'/>
                                    </label>
                                    <label htmlFor="low-priority" className='flex flex-row items-center justify-center'>
                                        <p
                                            className={`text-xs font-semibold bg-gray-300 p-2 rounded-md hover:bg-blue-300 cursor-pointer ${currentTaskPriority[2] ? 'bg-blue-300' : ''}`}
                                        >Low Priority</p>
                                        <input type="checkbox" name="low-priority" id="low-priority"
                                               value="Low Priority" onChange={handlePriorityChange}
                                               checked={currentTaskPriority[2]} className='hidden'/>
                                    </label>
                                </div>
                                <input type="number" name="" id="" value={currentTaskDuration}
                                       onChange={e => setCurrentTaskDuration(e.target.value)}
                                       placeholder='Duration in minutes'
                                       className='bg-gray-200 text-sm border p-2 rounded-md placeholder:text-sm focus:outline-none'/>
                            </div>
                             {/*Start Date Label and Date Picker*/}
                            <div className="flex items-center gap-x-2 justify-center">
                                <label htmlFor="due-date" className="text-sm font-semibold text-gray-600">
                                    Pick a Due Date:
                                </label>
                                <DatePicker
                                    id="due-date"
                                    selected={dueDate}
                                    onChange={(date) => {
                                        console.log('Selected Date:', date); // Add this line to check if the date is being captured
                                        setDueDate(date);
                                    }}
                                    minDate={new Date()} // Set the minimum selectable date to today
                                />
                            </div>
                            <input type="submit" value="" className='hidden'/>
                            <div className="flex items-center justify-center">

                                <button
                                    type="submit"
                                    className='bg-green-500 w-44 hover:bg-black hover:text-white text-sm p-2 rounded-md text-black font-bold flex items-center justify-center gap-x-2 my-4'
                                    style={{boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)'}}
                                >
                                    Add
                                    <FaPlus size={14}/>
                                </button>
                            </div>

                        </form>

                        <div
                            className='w-3/4 flex flex-row mt-12 items-center justify-between bg-gray-100 border px-2 rounded-md'
                            style={{width: '100%'}}
                        >
                            <p className='text-sm font-semibold text-gray-500'>
                                Schedule your tasks based on priority & duration
                            </p>
                            <button type="submit"
                                    className='bg-blue-400 w-44 hover:bg-black hover:text-white text-sm p-2 rounded-md text-black font-bold flex items-center justify-center gap-x-2 my-4'
                                    onClick={ScheduleTasks}
                                    style={{boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)'}}
                            >
                                {loading && <div className="loader"></div>}
                                Schedule
                                <FaRegClock size={16}/>

                            </button>
                        </div>
                    </div>

                    {/* ------------------------------------------------------------------------ */}

                    <div className='w-1/2'>
                        <div className="w-full flex justify-between mt-4">
                            <h1 className='text-xl font-bold text-gray-600 mb-2'
                                style={{textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'}}>
                                Scheduled Tasks :
                            </h1>

                            <button
                                className='bg-red-500 hover:bg-red-950 text-white py-2 px-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-x-2'
                                onClick={handleRemoveCompletedTasks}
                            >
                                Remove Completed Tasks
                                <MdDeleteSweep size={16}/>
                            </button>
                        </div>

                        {sortedScheduledTasks.length === 0 ? (
                            <div className='text-gray-400 font-semibold text-lg mb-4 py-4'>You have nothing scheduled
                                yet.</div>
                        ) : (
                            <div className='rounded-md flex flex-col gap-y-2 p-4'
                                 style={{boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)'}}>
                                {/* <h1 className='text-gray-800 font-bold mb-4 p-1'>Scheduled Tasks :</h1> */}
                                {/* High Priority */}
                                <ul className='scheduled-tasks-list'>
                                    {sortedScheduledTasks.map((task, index) => (
                                        <li
                                            key={task.id}
                                            className={`p-2 rounded-md text-sm flex flex-row items-center justify-between mb-2 ${
                                                task.completed ? 'bg-green-100' : 'bg-white'
                                            }`}
                                            style={{
                                                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                                                textDecoration: task.completed ? 'line-through' : 'none',
                                            }}

                                        >
                                            <div style={{flex: 1}}>{index + 1}</div>
                                            <p style={{flex: 3}}>{task.taskName}</p>
                                            <div className='flex flex-row items-center gap-x-2 justify-end'
                                                 style={{flex: 4}}>
                                                <p className={`p-2 rounded-md font-semibold text-xs ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </p>
                                                <p className='bg-blue-100 p-2 rounded-md font-semibold text-xs'>
                                                    {task.duration} mins
                                                </p>
                                                <p className='bg-gray-300 p-2 rounded-md font-semibold text-xs'>
                                                    {task.formattedDueDate}
                                                </p>
                                                <input
                                                    type='checkbox'
                                                    checked={task.completed}
                                                    onChange={(e) => handleTaskCompletion(task.id, e.target.checked)}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                        )}
                        <div className="w-full flex justify-between mt-4">
                            <p className='text-sm font-semibold text-gray-500'>
                                Total Scheduled tasks : {totalScheduledTasks}
                            </p>

                            <p className='text-sm font-semibold text-green-500'>
                                Completed tasks : {completedTasks}
                            </p>
                        </div>


                    </div>

                </div>

              <div className="flex flex-col items-center justify-center pt-16">
                <p className='text-md font-bold text-gray-500'>
                  Tasks completed so far until today — {completedTasksCount}
                </p>
              </div>

            </div>
            <ToastContainer
                position="top-right"
                theme="dark"
                autoClose={3000} // Duration for which the toast will be displayed (in milliseconds)
                hideProgressBar
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </div>

);

}

export default App;