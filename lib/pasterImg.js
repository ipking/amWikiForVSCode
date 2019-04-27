/**
 * @desc amWiki 工作端·粘帖图片模块
 * @author 耀轩之
 * @copyright vscode-paste-image
 * @description 这个模块的功能实现在Atom中与其有较大区别，因此参考vscode-paste-image修改所得
 */

var child_process_1 = require('child_process');
var path = require('path');
var fs = require('fs');

/**
 * @desc 获得格式化后的时间
 * @param {String} fmt 时间格式
 * @return {String} 返回格式化后的时间
 * @see {@link http://caibaojian.com/javascript-date-format.html}
 */
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

class pasterImg {
    constructor(_vscode) {
        this.vscode = _vscode;
        var configuration = this.vscode.workspace.getConfiguration('amWiki');
        this.bIsUseDate = configuration.get("pasterImg.bIsUseDate");
        this.bIsSpecFolder = configuration.get("pasterImg.bIsSpecFolder");
        this.specFolderObj = configuration.get("pasterImg.specFolder");
    }

    /**
     * @desc 将剪贴板上的图像文件粘贴到本地上
     * @return {Undefined} - 无返回值 
     */
    PasteImgFromClipboard() {
        var editor = this.vscode.window.activeTextEditor;
        this.bIsSpecFolder ? this.saveImageForSpecFolder(editor) : this.saveImage(editor);
    }

    /**
     * @desc 查找名称为library，并且同级目录下包含
     *       config.json的文件夹的所在路径
     * @param {String} filepath .md文件的所在路径
     * @param {String} selectText  被光标选中的文本
     * @return {String} 返回获得的图片文件路径信息 
     */
    getImgPath(filePath, selectText) {
        var date = new Date();
        var subList = [];
        var libraryPath = BackSearchFolder(filePath, subList, function (e) {
            //判断当前文件夹名称是否为library和此父文件夹下是否有config.json为判断依据
            if (path.basename(e) === 'library') {
                var parentDir = path.dirname(e);
                var configPath = parentDir + '/config.json';
                console.log(configPath);
                if (fs.existsSync(configPath)) {
                    console.log('当前文件夹已经匹配');
                } else {
                    return false;
                }
                return true;
            }
            return false;
        });

        if (libraryPath) {
            var assertPath = path.dirname(libraryPath) + '/assets';
            //假设没有assets文件夹则创建它
            if (!fs.existsSync(assertPath)) {
                fs.mkdirSync(assertPath);
            }

            var nCount = subList.length;
            for (var i = 0; i < nCount; i++) {
                var temp = subList[nCount - i - 1];
                assertPath += '/' + temp;
                if (!fs.existsSync(assertPath)) {
                    fs.mkdirSync(assertPath);
                }
            }
            var imageFileName = "";
            if (!selectText) {
                //图片的路径根据当前日期来决定，精确到秒即可
                imageFileName = date.getTime() + ".png";
            }
            else {
                imageFileName = selectText + ".png";
            }
            var fileID = getIDfromPath(filePath);
            if (isNaN(parseInt(fileID))) {
                //假设ID并不是数字，那么直接将其名称视为ID
                fileID = path.basename(filePath).split(path.extname(filePath))[0];
            }
            var imageFilePath = assertPath + '/' + fileID + '-' + imageFileName;
            return imageFilePath;
        }
        return null;
    }

    /**
     * @desc 操作剪贴板图像数据
     * @param {String} imagePath 图片文件保存的位置信息
     * @param {Data} cb 粘贴图片之后的回调函数，由调用者自定义
     * @return {Undefined} - 无返回值 
     */
    SaveImgFromClipboard(imagePath, cb) {
        if (!imagePath)
            return;
        var platform = process.platform;
        if (platform === 'win32') {
            // Windows
            var scriptPath = path.join(__dirname, './clipboardHelp/pc.ps1');
            var powershell = child_process_1.spawn('powershell', [
                '-noprofile',
                '-noninteractive',
                '-nologo',
                '-sta',
                '-executionpolicy', 'unrestricted',
                '-windowstyle', 'hidden',
                '-file', scriptPath,
                imagePath
            ]);
            powershell.on('exit', function (code, signal) {
                // console.log('exit', code, signal);
            });
            powershell.stdout.on('data', function (data) {
                cb(data.toString().trim());
            });
        }
        else if (platform === 'darwin') {
            // Mac
            var scriptPath = path.join(__dirname, './clipboardHelp/mac.applescript');
            var ascript = child_process_1.spawn('osascript', [scriptPath, imagePath]);
            ascript.on('exit', function (code, signal) {
                // console.log('exit',code,signal);
            });
            ascript.stdout.on('data', function (data) {
                cb(data.toString().trim());
            });
        }
        else {
            // Linux
            var scriptPath = path.join(__dirname, './clipboardHelp/linux.sh');
            var ascript = child_process_1.spawn('sh', [scriptPath, imagePath]);
            ascript.on('exit', function (code, signal) {
                // console.log('exit',code,signal);
            });
            ascript.stdout.on('data', function (data) {
                var result = data.toString().trim();
                if (result == "no xclip") {
                    alert("You need to install xclip command first.");
                    return;
                }
                cb(result);
            });
        }
    }

    saveImageForSpecFolder(editor) {
        // var rootPath = this.vscode.workspace.rootPath + '/source';
        var specFolderObj = this.specFolderObj;
        var rootPath = path.join(this.vscode.workspace.rootPath, specFolderObj.rootDir);
        var selection = editor.selection;
        //获得当前选中的文本内容
        var selectText = editor.document.getText(selection);
        var resFolder = this.specFolderObj.resDir;
        var imagePath = this.getImgPathForSpecFolder(rootPath, resFolder, selectText);
        imagePath = imagePath.replace(/\\/g, '/')
        console.log(rootPath);
        console.log(imagePath);
        console.log(resFolder);
        //将图片粘贴到本地
        this.SaveImgFromClipboard(imagePath, function (data) {
            if (!data)
                return;
            if (data === 'no image') {
                alert('当前剪贴板上并不包含图像数据');
                return;
            }
            editor.edit(function (editoBuilder) {
                editoBuilder.delete(editor.selection);
            }).then(function () {
                editor.edit(function (editoBuilder) {
                    var relativePath = imagePath.split(resFolder);
                    var tempImgPath = '![](' + resFolder + relativePath[relativePath.length - 1] + ')';
                    console.log(tempImgPath);
                    editoBuilder.insert(editor.selection.start, tempImgPath);
                });
            });
        });
    }

    /**
     * @desc 将剪贴板上的图像数据拷贝到指定目录位置并将其相对路径粘贴到
     *       文档当前光标所在之处
     * @param {Object} editor vscode.window.activeTextEditor 当前光标所在的文档编辑器位置
     * @return {Undefined} - 无返回值 
     */
    saveImage(editor) {
        var selection = editor.selection;
        var fileUri = editor.document.uri;
        if (!fileUri)
            return;
        if (fileUri.scheme === 'untitled') {
            alert("在粘贴图像之前请先保存当前文档");
            return;
        }

        //获得当前文档的所在路径
        var filePath = editor.document.fileName;
        //获得当前选中的文本内容
        var selectText = editor.document.getText(selection);
        //获得当前图像数据保存到本地的路径信息
        var imagePath = this.getImgPath(filePath, selectText);
        //将图片粘贴到本地
        this.SaveImgFromClipboard(imagePath, function (data) {
            if (!data)
                return;
            if (data === 'no image') {
                alert('当前剪贴板上并不包含图像数据');
                return;
            }
            editor.edit(function (editoBuilder) {
                editoBuilder.delete(editor.selection);
            }).then(function () {
                editor.edit(function (editoBuilder) {
                    var relativePath = imagePath.split('/assets/');
                    var tempImgPath = '![](assets/' + relativePath[relativePath.length - 1] + ')';
                    tempImgPath = tempImgPath.replace(/\\/g, '/')
                    editoBuilder.insert(editor.selection.start, tempImgPath);
                });
            });
        });
    }
}

module.exports = pasterImg;

/**
 * @desc 递归往上查找指定的文件夹
 * @param {String} srcPath 传入的路径信息
 * @param {String} dirList 递归搜索时遇到的文件夹名
 * @param {Function} callback 设置判断条件
 * @return {String} 假设找到符合条件的路径，则返回此路径信息
 *         反之，返回null
 */
function BackSearchFolder(srcPath, dirList, callback) {
    //遍历到盘符就结束
    if (srcPath.length > 3) {
        var parentDir = path.dirname(srcPath);
        if (!callback.call(this, parentDir)) {
            //分割文件（夹）上的ID
            var szID = getIDfromPath(parentDir);
            dirList.push(szID);
            return BackSearchFolder(parentDir, dirList, callback);
        } else {
            return parentDir;
        }
    } else {
        return null;
    }
}

/**
 * @desc 递归往上查找指定的文件夹
 * @param {String} srcPath 传入的路径信息
 * @return {Number} 返回文件（夹）上左侧的ID信息
 */
function getIDfromPath(filepath) {
    return path.basename(filepath).split('-')[0];
}
