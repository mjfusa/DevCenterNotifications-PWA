const getTask = (taskName) => {
    var iter = Windows.ApplicationModel.Background.BackgroundTaskRegistration.allTasks.first();
    var hascur = iter.hasCurrent;
    while (hascur) {
        var cur = iter.current.value;
        if (cur.name === taskName) {
            return cur;
        }
        hascur = iter.moveNext();
    }

    return null
}

const registerTask = (taskEntryPoint, taskName, trigger) => {
    let task = getTask(taskName),
        result

    if (task) {
        //BackgroundTaskSample.unregisterBackgroundTasks(task.name)
        //result = task.trigger.requestAsync()
        return
    } else {
        var builder = new Windows.ApplicationModel.Background.BackgroundTaskBuilder();

        builder.name = taskName;
        builder.taskEntryPoint = taskEntryPoint;
        builder.setTrigger(trigger);
        //required call
        var access = BackgroundExecutionManager.RequestAccessAsync().then().done();
 
        //abort if access isn't granted
        if (access == BackgroundAccessStatus.Denied)
            return;
 
        try {
            task = builder.register();
        } catch (e) {

        }

        return task
        //result = trigger.requestAsync()
    }
}
const unregisterTask = (taskName) => {
    var iter = Windows.ApplicationModel.Background.BackgroundTaskRegistration.allTasks.first();
    var hascur = iter.hasCurrent;
    while (hascur) {
        var cur = iter.current.value;
        if (cur.name === taskName) {
            cur.unregister(true);
        }
        hascur = iter.moveNext();
    }
}

window.BgServiceManager = {
    registerTask: registerTask,
    unregisterTask: unregisterTask,
    getTask: getTask
}

window.CONFIG = {
    env: 'prod'
}
