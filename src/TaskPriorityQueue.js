class TaskPriorityQueue {
    constructor() {
        this.tasks = [];
    }

    enqueue(task) {
        this.tasks.push(task);
        this.sortTasks(); // Add this line to sort the tasks after a new task is added
    }


    dequeue() {
        return this.tasks.shift() || null;
    }

    sortTasks() {
        // Custom sorting function based on due date, priority, and duration
        this.tasks.sort((a, b) => {
            const aDueDate = new Date(a.dueDate.toDate().setHours(0, 0, 0, 0));
            const bDueDate = new Date(b.dueDate.toDate().setHours(0, 0, 0, 0));

            // First, compare due dates
            if (aDueDate < bDueDate) return -1;
            if (aDueDate > bDueDate) return 1;

            // If the due dates are the same, compare priorities (highest first)
            if (a.priority === 'High Priority') return -1;
            if (b.priority === 'High Priority') return 1;
            if (a.priority === 'Medium Priority') return -1;
            if (b.priority === 'Medium Priority') return 1;

            // If the due dates and priorities are the same, prioritize by duration (lowest first)
            return a.duration - b.duration;
        });
    }



    getSortedTasksArray() {
        return [...this.tasks];
    }

    isEmpty() {
        return this.tasks.length === 0;
    }
}

export default TaskPriorityQueue;
