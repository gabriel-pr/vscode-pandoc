import * as vscode from 'vscode';
import { spawn, exec } from 'child_process';
import * as path from 'path';

interface CustomOption {
    renderOptionName: string,
    outputFormat: string, 
    cliOptions: string
}

var pandocOutputChannel = vscode.window.createOutputChannel('Pandoc');

function setStatusBarText(what: string, docType: string) {
    var date = new Date();
    var text = what + ' [' + docType + '] ' + date.toLocaleTimeString();
    vscode.window.setStatusBarMessage(text, 1500);
}

function getPandocOptions(quickPickLabel: string, customOptionsByName: Map<string, CustomOption>) {
    var pandocOptions: string;

    if (customOptionsByName.has(quickPickLabel)) {
        console.log(quickPickLabel + 'OptString = ' + pandocOptions);
        return customOptionsByName.get(quickPickLabel).cliOptions;
    }

    switch (quickPickLabel) {
        case 'pdf':
            pandocOptions = vscode.workspace.getConfiguration('pandoc').get('output.pdfOptString') as string;
            console.log('pdocOptstring = ' + pandocOptions);
            break;
        case 'docx':
            pandocOptions = vscode.workspace.getConfiguration('pandoc').get('output.docxOptString') as string;
            console.log('pdocOptstring = ' + pandocOptions);
            break;
        case 'html':
            pandocOptions = vscode.workspace.getConfiguration('pandoc').get('output.htmlOptString') as string;
            console.log('pdocOptstring = ' + pandocOptions);
            break;
        case 'asciidoc':
            pandocOptions = vscode.workspace.getConfiguration('pandoc').get('output.asciidocOptString') as string;
            console.log('pdocOptstring = ' + pandocOptions);
            break;
        case 'docbook':
            pandocOptions = vscode.workspace.getConfiguration('pandoc').get('output.docbookOptString') as string;
            console.log('pdocOptstring = ' + pandocOptions);
            break;
        case 'epub':
            pandocOptions = vscode.workspace.getConfiguration('pandoc').get('output.epubOptString') as string;
            console.log('pdocOptstring = ' + pandocOptions);
            break;
        case 'rst':
            pandocOptions = vscode.workspace.getConfiguration('pandoc').get('output.rstOptString') as string;
            console.log('pdocOptstring = ' + pandocOptions);
            break;
    }

    return pandocOptions;
}

function openDocument(outFile: string) {
    switch (process.platform) {
        case 'darwin':
            exec('open ' + outFile);
            break;
        case 'linux':
            exec('xdg-open ' + outFile);
            break;
        default:
            exec(outFile);
    }
}

function getPandocExecutablePath() {
    // By default pandoc executable should be in the PATH environment variable.
    var pandocExecutablePath: string = 'pandoc';
    console.log(vscode.workspace.getConfiguration('pandoc').get('executable'));
    if (vscode.workspace.getConfiguration('pandoc').has('executable') && 
        vscode.workspace.getConfiguration('pandoc').get('executable') !== '') {
        pandocExecutablePath = vscode.workspace.getConfiguration('pandoc').get<string>('executable');
    }
    return pandocExecutablePath;
}

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "vscode-pandoc" is now active!');

    var disposable = vscode.commands.registerCommand('pandoc.render', () => {

        var editor = vscode.window.activeTextEditor;
        var fullName = path.normalize(editor.document.fileName);
        var filePath = path.dirname(fullName);
        var fileName = path.basename(fullName);
        var fileNameOnly = path.parse(fileName).name;

        let items: vscode.QuickPickItem[] = [];
        if (vscode.workspace.getConfiguration('pandoc').get('output.pdfEnableDefault')) {
            items.push({ label: 'pdf', description: 'Render as pdf document' });
        }
        if (vscode.workspace.getConfiguration('pandoc').get('output.docxEnableDefault')) {
            items.push({ label: 'docx', description: 'Render as word document' });
        }
        if (vscode.workspace.getConfiguration('pandoc').get('output.htmlEnableDefault')) {
            items.push({ label: 'html', description: 'Render as html document' });
        }
        if (vscode.workspace.getConfiguration('pandoc').get('output.asciidocEnableDefault')) {
            items.push({ label: 'asciidoc', description: 'Render as asciidoc document' });
        }
        if (vscode.workspace.getConfiguration('pandoc').get('output.docbookEnableDefault')) {
            items.push({ label: 'docbook', description: 'Render as docbook document' });
        }
        if (vscode.workspace.getConfiguration('pandoc').get('output.epubEnableDefault')) {
            items.push({ label: 'epub', description: 'Render as epub document' });
        }
        if (vscode.workspace.getConfiguration('pandoc').get('output.rstEnableDefault')) {
            items.push({ label: 'rst', description: 'Render as rst document' });
        }
        
        let customOptionsByName = new Map();
        let customOptions: Array<CustomOption>

        customOptions = vscode.workspace.getConfiguration('pandoc').get('output.customValues') as CustomOption[]

        customOptions.forEach(element => {
            customOptionsByName.set(element.renderOptionName, element)
            items.push({ label: element.renderOptionName, description: 'Use custom options for ' + element.renderOptionName });
        });


        vscode.window.showQuickPick(items).then((qpSelection) => {
            if (!qpSelection) {
                return;
            }
            
            var customOptionUsed = customOptionsByName.has(qpSelection.label);
            var outputFormat = qpSelection.label;
            if (customOptionUsed) {
                outputFormat = customOptionsByName.get(qpSelection.label).outputFormat;
            }

            var inFile = path.join(filePath, fileName).replace(/(^.*$)/gm, "\"" + "$1" + "\"");
            var outFile = (path.join(filePath, fileNameOnly) + '.' + outputFormat).replace(/(^.*$)/gm, "\"" + "$1" + "\"");

            setStatusBarText('Generating', qpSelection.label);

            var pandocOptions = getPandocOptions(qpSelection.label, customOptionsByName);

            // debug
            console.log('debug: outFile = ' + inFile);
            console.log('debug: inFile = ' + outFile);
            console.log('debug: pandoc ' + inFile + ' -o ' + outFile + pandocOptions);
            
            var space = '\x20';
            var pandocExecutablePath = getPandocExecutablePath();
            console.log('debug: pandoc executable path = ' + pandocExecutablePath);

            var targetExec = '"' + pandocExecutablePath + '"' + space + inFile + space + '-o' + space + outFile + space + pandocOptions;
            console.log('debug: exec ' + targetExec);

            var child = exec(targetExec, { cwd: filePath }, function (error, stdout, stderr) {
                if (stdout !== null) {
                    console.log(stdout.toString());
                    pandocOutputChannel.append(stdout.toString() + '\n');
                }

                if (stderr !== null) {
                    console.log(stderr.toString());
                    if (stderr !== "") {
                        vscode.window.showErrorMessage('stderr: ' + stderr.toString());
                        pandocOutputChannel.append('stderr: ' + stderr.toString() + '\n');
                    }
                }

                if (error !== null) {
                    console.log('exec error: ' + error);
                    vscode.window.showErrorMessage('exec error: ' + error);
                    pandocOutputChannel.append('exec error: ' + error + '\n');
                } else {
                    var openViewer = vscode.workspace.getConfiguration('pandoc').get('render.openViewer');

                    if (openViewer) {
                        setStatusBarText('Launching', qpSelection.label);
                        openDocument(outFile);
                    }

                }
            });
        });
    });

    context.subscriptions.push(disposable);
}
