/**
 * @desc amWiki 工作端·ToDoTasks模块
 * @author 耀轩之
 * @description 参考sublime Text的PlainTasks实现，
 */

var vscode = require('vscode');

class todoBase {
    constructor() {
        // this.task_icons = ['☐', '❑', '✘', '✔']
        // this.task_icons = ['[+]', '[-]', '[x]', '[O]']
        var configuration = vscode.workspace.getConfiguration('amWiki')
        var openFlag = configuration.get("todo.open")
        var handleFlag = configuration.get("todo.handle")
        var cancelFlag = configuration.get("todo.cancel")
        var doneFlag = configuration.get("todo.done")
        this.task_icons = [openFlag, handleFlag, cancelFlag, doneFlag]
        this.task_actions = { 'open': 0, 'handle': 1, 'cancel': 2, 'done': 3 }
    }

    replaceTag(tag1st, tag2nd){
        var result = false
        if(tag1st == tag2nd){
            return result;
        }
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return result;
        }
        editor.edit(function (editoBuilder) {
            var lineIdx = editor.selection.active.line
            var lineText = editor.document.lineAt(lineIdx).text
            var start = lineText.lastIndexOf(tag1st)
            if (start < 0)
                return result;
            var end = start + tag1st.length
            var oldSel = new vscode.Selection(lineIdx, start, lineIdx, end);
            editoBuilder.replace(oldSel, tag2nd)
            result = true
        });
        return result
    }

    insertTag(tag, after_tag_string){
        var vm = this
        var task_actions = this.task_actions;
        var task_icons = this.task_icons;
        var curr_tag = task_icons[this.task_actions[tag]]
        
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return result;
        }
        editor.edit(function (editoBuilder) {
            var lineIdx = editor.selection.active.line
            var textLine = editor.document.lineAt(lineIdx)
            var lineText = textLine.text
            for (var n in task_actions){
                var icon = task_icons[task_actions[n]]
                var start = lineText.indexOf(icon)
                if (start >= 0){
                    vm.taskHandle(tag)
                    return
                }
            }
            editoBuilder.insert(textLine.range.start, curr_tag+after_tag_string)
        });
    }

    taskHandle(tag){
        var count = Object.keys(this.task_actions).length;
        var tempArrs = []
        for (var n=0; n < count; n++){ 
            tempArrs.push([n, this.task_actions[tag]])
        }

        for (var m=0; m<tempArrs.length; m++){ 
            var v = tempArrs[m]
            var oldTag = this.task_icons[v[0]]
            var newTag = this.task_icons[v[1]]
            if(this.replaceTag(oldTag, newTag))
                return
        }
    }

    openTask(){
        this.insertTag('open', ' ')
    }

    cancelTask(){
        var tag = 'cancel'
        this.taskHandle(tag)
    }

    handTask(){
        var tag = 'handle'
        this.taskHandle(tag)
    }

    doneTask(){
        var tag = 'done'
        this.taskHandle(tag)
    }
}

module.exports = todoBase;
