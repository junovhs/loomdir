// --- FILE: loomdir/js/main.js --- //
import * as fileSystem from './fileSystem.js';
import * as uiManager from './uiManager.js';
import * as treeView from './treeView.js';
import * as statsManager from './statsManager.js';
import * as reportGenerator from './reportGenerator.js';
import * as notificationSystem from 'notificationSystem';
import * as errorHandler from 'errorHandler';
import * as fileEditor from 'fileEditor';
import * as aiPatcher from 'aiPatcher';
import * as zipManager from 'zipManager';
import * as utils from 'utils';
import * as scaffoldImporter from 'scaffoldImporter';
import * as sidebarResizer from './sidebarResizer.js';
import * as aiDebriefingAssistant from 'aiDebriefingAssistant';


export const appState = {
    activeTabId: 'textReportTab',
    fullScanData: null,
    committedScanData: null,
    selectionCommitted: false,
    processingInProgress: false,
    currentEditingFile: null,
    initialLoadComplete: false,
    editorInstance: null,
    previewEditorInstance: null,
    isLoadingFileContent: false,
    editorActiveAsMainView: false,
    previousActiveTabId: null,
    directoryHandle: null,
    saveState: null, // In-memory snapshot of file contents
};

export let elements = {};

function populateElements() {
    const elementIds = {
        pageLoader: 'pageLoader',
        dropZone: 'dropZone',
        folderInput: 'folderInput',
        treeContainer: 'treeContainer',
        globalStatsDiv: 'globalStats',
        selectionSummaryDiv: 'selectionSummary',
        appContainer: 'appContainer',
        leftSidebar: 'leftSidebar',
        sidebarResizer: 'sidebarResizer',
        mainView: 'mainView',
        mainViewTabs: 'mainViewTabs',
        tabContentArea: 'tabContentArea',
        rightStatsPanel: 'rightStatsPanel',
        treeViewControls: 'treeViewControls',
        generalActions: 'generalActions',
        loader: 'loader',
        textOutputEl: 'textOutput',
        copyReportButton: 'copyReportButton',
        selectAllBtn: 'selectAllBtn',
        deselectAllBtn: 'deselectAllBtn',
        commitSelectionsBtn: 'commitSelectionsBtn',
        expandAllBtn: 'expandAllBtn',
        collapseAllBtn: 'collapseAllBtn',
        downloadProjectBtn: 'downloadProjectBtn',
        clearProjectBtn: 'clearProjectBtn',
        restoreStateBtn: 'restoreStateBtn',
        saveStateStatus: 'saveStateStatus',
        filePreview: 'filePreview',
        filePreviewTitle: 'filePreviewTitle',
        filePreviewContentWrapper: 'filePreviewContentWrapper',
        filePreviewContent: 'filePreviewContent',
        closePreview: 'closePreview',
        textOutputContainerOuter: 'textOutputContainerOuter',
        visualOutputContainer: 'visualOutputContainer',
        notification: 'notification',
        errorReport: 'errorReport',
        fileEditor: 'fileEditor',
        editorFileTitle: 'editorFileTitle',
        editorContent: 'editorContent',
        closeEditorBtn: 'closeEditorBtn',
        aiPatchPanel: 'aiPatchPanel',
        aiPatchInput: 'aiPatchInput',
        applyAiPatchBtn: 'applyAiPatchBtn',
        aiPatchOutputLog: 'aiPatchOutputLog',
        aiPatchDiffModal: 'aiPatchDiffModal',
        diffFilePath: 'diffFilePath',
        diffOutputContainer: 'diffOutputContainer',
        closeAiPatchDiffModal: 'closeAiPatchDiffModal',
        confirmApplyPatchChanges: 'confirmApplyPatchChanges',
        skipPatchChanges: 'skipPatchChanges',
        cancelAllPatchChanges: 'cancelAllPatchChanges',
        mainActionDiv: 'mainAction',
        importAiScaffoldBtn: 'importAiScaffoldBtn',
        copyScaffoldPromptBtn: 'copyScaffoldPromptBtn',
        scaffoldImportModal: 'scaffoldImportModal',
        closeScaffoldModalBtn: 'closeScaffoldModalBtn',
        aiScaffoldJsonInput: 'aiScaffoldJsonInput',
        createProjectFromScaffoldBtn: 'createProjectFromScaffoldBtn',
        cancelScaffoldImportBtn: 'cancelScaffoldImportBtn',
        textReportTab: 'textReportTab',
        aiPatcherTab: 'aiPatcherTab',
        aiDebriefingAssistantBtn: 'aiDebriefingAssistantBtn',
        aiDebriefingAssistantModal: 'aiDebriefingAssistantModal',
        closeAiDebriefingAssistantModalBtn: 'closeAiDebriefingAssistantModalBtn',
        debriefMetadataCheckbox: 'debriefMetadataCheckbox',
        assembleDebriefPackageBtn: 'assembleDebriefPackageBtn',
        useStandardDebriefProfileBtn: 'useStandardDebriefProfileBtn',
    };

    for (const key in elementIds) {
        elements[key] = document.getElementById(elementIds[key]);
        if (!elements[key] && !['cancelScaffoldImportBtn', 'cancelAiBriefBtn', 'closeAiBriefingStudioModal', 'generateAiBriefPackageBtn', 'createProjectFromScaffoldBtn', 'closeScaffoldModalBtn', 'sidebarToolsContainer', 'viewModeToggleBtn', 'globalStatsPanel'].includes(key) ) {
            // console.warn(`[populateElements] Element with ID '${elementIds[key]}' not found for key '${key}'.`);
        }
    }

    elements.fileTypeTableBody = document.querySelector('#fileTypeTable tbody');
    if (!elements.fileTypeTableBody) {
        console.warn("[populateElements] Element '#fileTypeTable tbody' not found.");
    }
}

const scaffoldPromptTemplate = `Please generate a JSON object to define a project scaffold.
The JSON object MUST have the following two top-level properties:

1.  "structureString": A single string value representing the entire directory structure using parenthesis notation.
    -   Syntax: \`RootFolder(item1,item2,NestedFolder(itemA,itemB),emptyFolder())\`
    -   Items (files or folders) at the same level are separated by a comma \`,\`.
    -   A folder is denoted by its name followed by parentheses \`()\`. Even if it contains items, the parentheses are essential after its name.
    -   Files are just their names (e.g., \`index.html\`).
    -   An empty folder is \`FolderName()\`.
    -   There should be no spaces around commas or parentheses unless they are part of a file/folder name (which is discouraged for simplicity).
    -   The very first name in the string is the root project folder name.

2.  "fileContents": An array of objects. Each object in this array represents a file that needs content and MUST have:
    -   "filePath": A string representing the full path of the file, starting with the root project folder name declared in the \`structureString\`, followed by any subfolders, and ending with the filename. Example: \`"MyProjectName/src/app.js"\`. Use forward slashes \`/\` as path separators. This path MUST EXACTLY match a file defined in the \`structureString\`.
    -   "content": A string containing the complete text content for that file. Ensure to properly escape special characters within the content string if necessary for valid JSON (e.g., newlines as \\n, quotes as \\\").

Instructions for you, the AI:
- Generate ONLY the JSON object. Do not include any explanations, comments, or markdown formatting like \`\`\`json ... \`\`\` around the JSON output.
- The output must be a single, valid JSON object.
- Every file name that appears in the \`structureString\` (i.e., any name not followed by \`()\`) MUST have a corresponding entry in the \`fileContents\` array.
- Folder names (those ending with \`()\`) in the \`structureString\` should NOT have entries in \`fileContents\`.
- If I ask for a simple project like "a basic website", create an appropriate root project folder name (e.g., "BasicWebsiteProject") for the \`structureString\` and all \`filePath\` entries. Include at least an "index.html", a "css/style.css", and a "js/script.js" with minimal boilerplate content.

Example of the expected JSON object format:
\`\`\`json
{
  "structureString": "MyWebApp(index.html,README.md,assets(logo.svg),src(app.js,components(Button.js,Card.js),utils()),css(main.css,themes(dark.css)))",
  "fileContents": [
    {
      "filePath": "MyWebApp/index.html",
      "content": "<!DOCTYPE html>\\n<html>\\n<head><title>My Web App</title><link rel=\\"stylesheet\\" href=\\"css/main.css\\"></head>\\n<body><h1>Hello!</h1><script src=\\"src/app.js\\"></script></body>\\n</html>"
    },
    {
      "filePath": "MyWebApp/README.md",
      "content": "# MyWebApp\\nThis is a test project."
    },
    {
      "filePath": "MyWebApp/assets/logo.svg",
      "content": "<svg width=\\"100\\" height=\\"100\\"><circle cx=\\"50\\" cy=\\"50\\" r=\\"40\\" stroke=\\"green\\" stroke-width=\\"4\\" fill=\\"yellow\\" /></svg>"
    },
    {
      "filePath": "MyWebApp/src/app.js",
      "content": "console.log(\\"App started!\\");\\nimport Button from './components/Button.js';\\n// More app logic"
    },
    {
      "filePath": "MyWebApp/src/components/Button.js",
      "content": "export default function Button() {\\n  return '<button>Click Me</button>';\\n}"
    },
    {
      "filePath": "MyWebApp/src/components/Card.js",
      "content": "export default function Card(title) {\\n  return \`<div><h2>\${title}</h2></div>\`;\\n}"
    },
    {
      "filePath": "MyWebApp/css/main.css",
      "content": "body { margin: 0; padding: 10px; }\\nh1 { color: blue; }"
    },
    {
      "filePath": "MyWebApp/css/themes/dark.css",
      "content": "body { background: #333; color: white; }"
    }
  ]
}
\`\`\`

Now, based on my request, generate the project scaffold JSON object:
`;


function handleCopyScaffoldPrompt() {
    navigator.clipboard.writeText(scaffoldPromptTemplate)
        .then(() => {
            notificationSystem.showNotification("AI Scaffold Prompt copied to clipboard!", { duration: 3000 });
        })
        .catch(err => {
            console.error('Failed to copy scaffold prompt: ', err);
            errorHandler.showError({
                name: "ClipboardError",
                message: "Failed to copy scaffold prompt to clipboard.",
                stack: err.stack
            });
        });
}


function setupEventListeners() {
    const safeAddEventListener = (element, event, handler, elementName) => {
        if (element) {
            element.addEventListener(event, handler);
        }
    };

    safeAddEventListener(elements.dropZone, 'dragover', handleDragOver, 'dropZone');
    safeAddEventListener(elements.dropZone, 'dragleave', handleDragLeave, 'dropZone');
    safeAddEventListener(elements.dropZone, 'drop', handleFileDrop, 'dropZone');
    safeAddEventListener(elements.dropZone, 'click', () => { if (elements.folderInput) elements.folderInput.click(); }, 'dropZone (for folderInput click)');
    safeAddEventListener(elements.folderInput, 'change', handleFolderSelect, 'folderInput');

    safeAddEventListener(elements.selectAllBtn, 'click', () => treeView.setAllSelections(true), 'selectAllBtn');
    safeAddEventListener(elements.deselectAllBtn, 'click', () => treeView.setAllSelections(false), 'deselectAllBtn');
    safeAddEventListener(elements.commitSelectionsBtn, 'click', commitSelections, 'commitSelectionsBtn');
    safeAddEventListener(elements.downloadProjectBtn, 'click', zipManager.downloadProjectAsZip, 'downloadProjectBtn');
    safeAddEventListener(elements.clearProjectBtn, 'click', clearProjectData, 'clearProjectBtn');
    safeAddEventListener(elements.restoreStateBtn, 'click', restoreSaveState, 'restoreStateBtn'); // <<< ADD THIS

    safeAddEventListener(elements.expandAllBtn, 'click', () => treeView.toggleAllFolders(false), 'expandAllBtn');
    safeAddEventListener(elements.collapseAllBtn, 'click', () => treeView.toggleAllFolders(true), 'collapseAllBtn');

    safeAddEventListener(elements.closePreview, 'click', () => {
        if (elements.filePreview) elements.filePreview.style.display = 'none';
        if (appState.previewEditorInstance) {
            appState.previewEditorInstance.setValue('');
        }
    }, 'closePreview');

    safeAddEventListener(elements.copyReportButton, 'click', copyReport, 'copyReportButton');
    safeAddEventListener(elements.copyScaffoldPromptBtn, 'click', handleCopyScaffoldPrompt, 'copyScaffoldPromptBtn');
    
    const cancelDebriefBtn = document.getElementById('cancelAiDebriefBtn'); 
    if (cancelDebriefBtn && elements.closeAiDebriefingAssistantModalBtn) {
        cancelDebriefBtn.addEventListener('click', () => elements.closeAiDebriefingAssistantModalBtn.click());
    }
}

function handleDragOver(e) { e.preventDefault(); if (elements.dropZone) elements.dropZone.classList.add('dragover'); }
function handleDragLeave() { if (elements.dropZone) elements.dropZone.classList.remove('dragover'); }

async function handleFileDrop(event) {
    event.preventDefault();
    if (appState.processingInProgress) return;
    elements.dropZone.classList.remove('dragover');

    try {
        const handle = await event.dataTransfer.items[0].getAsFileSystemHandle();
        if (handle.kind !== 'directory') {
            errorHandler.showError({ name: "InvalidTargetError", message: "Please drop a folder, not an individual file." });
            return;
        }
        appState.directoryHandle = handle; // Store the handle
        await verifyAndProcessDirectory(handle);
    } catch (err) {
        console.error("Error getting file system handle:", err);
        errorHandler.showError({ name: "PermissionError", message: "Could not access the folder. You may need to grant permission." });
    }
}

async function handleFolderSelect(event) {
    if (appState.processingInProgress) return;
    try {
        const handle = await window.showDirectoryPicker();
        appState.directoryHandle = handle; // Store the handle
        await verifyAndProcessDirectory(handle);
    } catch (err) {
        console.error("Error with directory picker:", err);
        // This error often happens if the user cancels the dialog, so we don't need a big error message.
        notificationSystem.showNotification("Directory selection cancelled.", { duration: 2000 });
    } finally {
        if (elements.folderInput) elements.folderInput.value = '';
    }
}


function createVirtualDirectoryFromFiles(fileList, rootName) {
    const root = {
        name: rootName, path: rootName, type: 'folder', depth: 0, children: [],
        fileCount: 0, dirCount: 0, totalSize: 0, fileTypes: {}, entryHandle: null
    };
    const allFilesList = [];
    const allFoldersList = [{ name: root.name, path: root.path, depth: 0, entryHandle: null }];
    const folderMap = new Map([[rootName, root]]);

    for (const file of fileList) {
        const pathParts = file.webkitRelativePath.split('/');
        const fileName = pathParts.pop();
        let currentParent = root;
        let currentPathForFolderConstruction = rootName;

        for (let i = 0; i < pathParts.length; i++) {
            const folderNamePart = pathParts[i];
            if (i === 0 && folderNamePart === rootName && pathParts.length > 1) continue;
            if(pathParts.length === 1 && folderNamePart === rootName) { /* file directly in root dir */ }
            else {currentPathForFolderConstruction += '/' + folderNamePart;}

            if (!folderMap.has(currentPathForFolderConstruction)) {
                const newFolder = {
                    name: folderNamePart, path: currentPathForFolderConstruction, type: 'folder',
                    depth: i + 1, children: [], fileCount: 0, dirCount: 0, totalSize: 0,
                    fileTypes: {}, entryHandle: null
                };
                folderMap.set(currentPathForFolderConstruction, newFolder);
                if (currentParent.path !== newFolder.path) {
                   currentParent.children.push(newFolder);
                }
                allFoldersList.push({ name: newFolder.name, path: newFolder.path, depth: newFolder.depth, entryHandle: null });
                currentParent = newFolder;
            } else {
                currentParent = folderMap.get(currentPathForFolderConstruction);
            }
        }

        const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '(no ext)';
        const filePath = file.webkitRelativePath;
        const fileInfo = {
            name: fileName, type: 'file', size: file.size, path: filePath,
            extension: ext, depth: pathParts.length + 1,
            entryHandle: file 
        };
        currentParent.children.push(fileInfo);
        allFilesList.push({ ...fileInfo });
    }

    function calculateFolderStats(folder) {
        folder.fileCount = 0; folder.dirCount = 0; folder.totalSize = 0; folder.fileTypes = {};
        for (const child of folder.children) {
            if (child.type === 'folder') {
                calculateFolderStats(child);
                folder.dirCount++; folder.dirCount += child.dirCount;
                folder.fileCount += child.fileCount; folder.totalSize += child.totalSize;
                Object.entries(child.fileTypes).forEach(([ext, data]) => {
                    if (!folder.fileTypes[ext]) folder.fileTypes[ext] = { count: 0, size: 0 };
                    folder.fileTypes[ext].count += data.count;
                    folder.fileTypes[ext].size += data.size;
                });
            } else {
                folder.fileCount++; folder.totalSize += child.size;
                if (!folder.fileTypes[child.extension]) folder.fileTypes[child.extension] = { count: 0, size: 0 };
                folder.fileTypes[child.extension].count++;
                folder.fileTypes[child.extension].size += child.size;
            }
        }
    }
    calculateFolderStats(root);

    let maxDepthVal = 0;
    allFilesList.forEach(f => { if(f.depth > maxDepthVal) maxDepthVal = f.depth; });
    allFoldersList.forEach(f => { if(f.depth > maxDepthVal) maxDepthVal = f.depth; });

    return {
        directoryData: root, allFilesList, allFoldersList,
        maxDepth: maxDepthVal,
        deepestPathExample: root.path,
        emptyDirCount: countEmptyDirs(root, root.name)
    };
}

function countEmptyDirs(node, rootName) {
    let count = 0;
    if (node.type === 'folder') {
        if (node.children.length === 0 && node.name !== rootName) { 
            count = 1;
        }
        else { for (const child of node.children) { count += countEmptyDirs(child, rootName); } }
    } return count;
}

async function verifyAndProcessDirectory(directoryHandle) {
    // Verify permissions
    if (await directoryHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
        if (await directoryHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
            errorHandler.showError({ name: "PermissionError", message: "Write permission for the folder was denied." });
            return;
        }
    }

    resetUIForProcessing(`Processing '${directoryHandle.name}'...`);
    appState.processingInProgress = true;

    try {
        appState.fullScanData = await fileSystem.processDirectoryEntryRecursive(directoryHandle, directoryHandle.name, 0);
        
        // ... (The rest of the logic remains the same as before)
        if (appState.fullScanData.directoryData && elements.treeContainer) {
             treeView.renderTree(appState.fullScanData.directoryData, elements.treeContainer);
        } else {
             throw new Error("processDirectoryEntryRecursive failed to return directoryData or treeContainer missing.");
        }
        const allInitiallySelectedPaths = new Set();
        if(appState.fullScanData.allFilesList) appState.fullScanData.allFilesList.forEach(f => allInitiallySelectedPaths.add(f.path));
        if(appState.fullScanData.allFoldersList) appState.fullScanData.allFoldersList.forEach(f => allInitiallySelectedPaths.add(f.path));

        appState.committedScanData = fileSystem.filterScanData(appState.fullScanData, allInitiallySelectedPaths);
        appState.selectionCommitted = true;

        if (elements.rightStatsPanel) elements.rightStatsPanel.style.display = 'flex';
        if (elements.visualOutputContainer) elements.visualOutputContainer.style.display = 'flex';
        if (elements.mainView) elements.mainView.style.display = 'flex';
        if (elements.treeViewControls) elements.treeViewControls.style.display = 'flex';
        if (elements.generalActions) elements.generalActions.style.display = 'flex';

        uiManager.activateTab(appState.activeTabId || 'textReportTab');
        uiManager.refreshAllUI();
        enableUIControls();
        await createSaveState(); // <<< ADD THIS LINE

    } catch (err) {
        console.error("ERROR PROCESSING DIRECTORY:", err);
        errorHandler.showError(err);
        showFailedUI("Directory processing failed. Check console and error report.");
    } finally {
        if(elements.loader) elements.loader.classList.remove('visible');
        appState.processingInProgress = false;
    }
}


export function resetUIForProcessing(loaderMsg = "ANALYSING...") {
    if (elements.loader) {
        elements.loader.textContent = loaderMsg;
        elements.loader.classList.add('visible');
    }

    if (appState.editorActiveAsMainView && typeof fileEditor.closeEditor === 'function') {
        fileEditor.closeEditor(); 
    } else {
        if (elements.mainViewTabs) elements.mainViewTabs.style.display = 'flex';
        if (elements.tabContentArea) elements.tabContentArea.style.display = 'flex';
        if (elements.fileEditor) elements.fileEditor.style.display = 'none'; 
    }
    appState.editorActiveAsMainView = false;
    appState.previousActiveTabId = null;


    if (elements.rightStatsPanel) elements.rightStatsPanel.style.display = 'none';
    if (elements.visualOutputContainer) elements.visualOutputContainer.style.display = 'none';
    if (elements.treeViewControls) elements.treeViewControls.style.display = 'none';
    if (elements.generalActions) elements.generalActions.style.display = 'none';


    if (elements.tabContentArea) {
        elements.tabContentArea.querySelectorAll('.tab-content-item').forEach(tc => {
            tc.classList.remove('active');
            tc.style.display = 'none';
        });
    }
    if (elements.mainViewTabs) {
      elements.mainViewTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    }
    if (elements.mainView) elements.mainView.style.display = 'flex';


    const modalsToHide = [
        elements.scaffoldImportModal,
        elements.aiPatchDiffModal, elements.filePreview, elements.errorReport,
        elements.aiDebriefingAssistantModal // Add new modal here
    ];
    modalsToHide.forEach(panel => { if (panel && panel.style) panel.style.display = 'none'; });


    if(elements.aiPatchInput) elements.aiPatchInput.value = '';
    if(elements.aiPatchOutputLog) elements.aiPatchOutputLog.textContent = 'Awaiting patch application...';
    if(elements.diffOutputContainer) elements.diffOutputContainer.innerHTML = '';

    if (elements.treeContainer) elements.treeContainer.innerHTML = '<div class="empty-notice">DROP A FOLDER OR SELECT ONE TO BEGIN.</div>';
    if (elements.globalStatsDiv) elements.globalStatsDiv.innerHTML = '';
    if (elements.fileTypeTableBody) elements.fileTypeTableBody.innerHTML = '';
    if (elements.textOutputEl) elements.textOutputEl.textContent = '';
    if (elements.selectionSummaryDiv && elements.selectionSummaryDiv.style) elements.selectionSummaryDiv.style.display = 'none';


    if(appState.editorInstance) appState.editorInstance.setValue('');
    if(appState.previewEditorInstance) appState.previewEditorInstance.setValue('');

    appState.fullScanData = null; appState.committedScanData = null;
    appState.selectionCommitted = false; appState.currentEditingFile = null;
    appState.activeTabId = 'textReportTab'; 

    if (fileEditor.getAllEditedFiles && typeof fileEditor.getAllEditedFiles === 'function') {
        const editedFilesMap = fileEditor.getAllEditedFiles();
        if (editedFilesMap && typeof editedFilesMap.clear === 'function') {
            editedFilesMap.clear();
        }
    }
    disableUIControls();
    if (elements.mainActionDiv && elements.mainActionDiv.style) elements.mainActionDiv.style.display = 'flex';
    if (elements.importAiScaffoldBtn) elements.importAiScaffoldBtn.disabled = false;
    if (elements.copyScaffoldPromptBtn) elements.copyScaffoldPromptBtn.disabled = false;
    if (elements.clearProjectBtn) elements.clearProjectBtn.disabled = true;
    if (elements.aiDebriefingAssistantBtn) elements.aiDebriefingAssistantBtn.disabled = true;


    if (typeof uiManager.activateTab === 'function') {
        uiManager.activateTab('textReportTab'); 
    }
}

export function enableUIControls() {
    const buttonsToEnable = [
        elements.selectAllBtn, elements.deselectAllBtn, elements.commitSelectionsBtn,
        elements.expandAllBtn, elements.collapseAllBtn,
        elements.downloadProjectBtn, elements.clearProjectBtn, elements.copyReportButton,
        elements.applyAiPatchBtn, elements.aiDebriefingAssistantBtn
    ];
    buttonsToEnable.forEach(btn => { if (btn) btn.disabled = !appState.fullScanData; }); // Disable if no fullScanData

    if (elements.importAiScaffoldBtn) {
        elements.importAiScaffoldBtn.disabled = appState.processingInProgress;
    }
    if (elements.copyScaffoldPromptBtn) {
        elements.copyScaffoldPromptBtn.disabled = appState.processingInProgress;
    }
     if (elements.clearProjectBtn) { // Already in buttonsToEnable, but this specific logic is fine
        elements.clearProjectBtn.disabled = !appState.fullScanData;
    }
    if(elements.mainViewTabs) elements.mainViewTabs.querySelectorAll('.tab-button').forEach(btn => btn.disabled = !appState.fullScanData);

    // Specific for commit button: disable if no fullScanData
    if (elements.commitSelectionsBtn) {
        elements.commitSelectionsBtn.disabled = !appState.fullScanData;
    }
     if (elements.copyReportButton) { // Already in buttonsToEnable
        elements.copyReportButton.disabled = !appState.fullScanData;
    }
}

function disableUIControls() {
     const buttonsToDisable = [
        elements.selectAllBtn, elements.deselectAllBtn, elements.commitSelectionsBtn,
        elements.expandAllBtn, elements.collapseAllBtn,
        elements.downloadProjectBtn, elements.clearProjectBtn, elements.copyReportButton,
        elements.applyAiPatchBtn,
        elements.aiDebriefingAssistantBtn,
        elements.restoreStateBtn
    ];
    buttonsToDisable.forEach(btn => { if (btn) btn.disabled = true; });
    if(elements.mainViewTabs) elements.mainViewTabs.querySelectorAll('.tab-button').forEach(btn => btn.disabled = true);
}

export function showFailedUI(message = "SCAN FAILED - SEE ERROR REPORT") {
    if(elements.textOutputEl && elements.textReportTab && elements.textReportTab.contains(elements.textOutputEl)) {
        elements.textOutputEl.textContent = message;
        if (typeof uiManager.activateTab === 'function') uiManager.activateTab('textReportTab');
    } else if (elements.textReportTab) {
        const errorNotice = document.createElement('div');
        errorNotice.className = 'empty-notice';
        errorNotice.textContent = message;
        elements.textReportTab.innerHTML = '';
        elements.textReportTab.appendChild(errorNotice);
        if (typeof uiManager.activateTab === 'function') uiManager.activateTab('textReportTab');
    }

    if(elements.visualOutputContainer) elements.visualOutputContainer.style.display = 'none';
    if(elements.rightStatsPanel) elements.rightStatsPanel.style.display = 'none';
    if (elements.treeViewControls) elements.treeViewControls.style.display = 'none';
    if (elements.generalActions) elements.generalActions.style.display = 'none';


    if(elements.loader) elements.loader.classList.remove('visible');
    if(elements.mainActionDiv && elements.mainActionDiv.style) elements.mainActionDiv.style.display = 'flex';
    if(elements.clearProjectBtn) elements.clearProjectBtn.disabled = true;
    if (elements.importAiScaffoldBtn) elements.importAiScaffoldBtn.disabled = false;
    if (elements.copyScaffoldPromptBtn) elements.copyScaffoldPromptBtn.disabled = false;
    if (elements.aiDebriefingAssistantBtn) elements.aiDebriefingAssistantBtn.disabled = true;



    if (elements.mainViewTabs) elements.mainViewTabs.style.display = 'flex';
    if (elements.tabContentArea) elements.tabContentArea.style.display = 'flex';
    if (elements.fileEditor) elements.fileEditor.style.display = 'none';
    appState.editorActiveAsMainView = false;
}

function commitSelections() {
    if (!appState.fullScanData) {
        errorHandler.showError({ name: "NoDataError", message: "No directory scanned yet." });
        return;
    }

    const currentSelectedPaths = new Set();
    if (elements.treeContainer) {
        elements.treeContainer.querySelectorAll('li').forEach(li => {
            if (li.dataset.selected === "true") {
                currentSelectedPaths.add(li.dataset.path);
            }
        });
    }

    if (currentSelectedPaths.size === 0 && appState.fullScanData.allFilesList && appState.fullScanData.allFilesList.length > 0) {
        notificationSystem.showNotification("Cannot commit: No files or folders are selected in the tree.", { duration: 3500 });
        return;
    }

    appState.committedScanData = fileSystem.filterScanData(appState.fullScanData, currentSelectedPaths);

    if (appState.fullScanData && appState.fullScanData.allFilesList && appState.committedScanData && appState.fullScanData.directoryData) {
        const editedFileMap = fileEditor.getAllEditedFiles();
        editedFileMap.forEach((fileState, filePath) => {
            const originalFileFromFullScan = appState.fullScanData.allFilesList.find(f => f.path === filePath);
            if ((!originalFileFromFullScan || !originalFileFromFullScan.entryHandle) && currentSelectedPaths.has(filePath)) {
                if (!appState.committedScanData.allFilesList.find(committedFile => committedFile.path === filePath)) {
                    const name = filePath.substring(filePath.lastIndexOf('/') + 1);
                    const extension = name.includes('.') ? name.substring(name.lastIndexOf('.')).toLowerCase() : '(no ext)';
                    let depth = 0;
                    const rootPath = appState.fullScanData.directoryData.path;
                    if (filePath.startsWith(rootPath + '/')) {
                        depth = (filePath.substring(rootPath.length + 1).match(/\//g) || []).length +1;
                    } else if (filePath.startsWith(rootPath) && !filePath.includes('/')) {
                         depth = 1;
                    } else {
                        const rootPartsCount = (rootPath.match(/\//g) || []).length;
                        const filePartsCount = (filePath.match(/\//g) || []).length;
                        depth = Math.max(1, filePartsCount - rootPartsCount + (rootPath.includes('/') ? 0:1) );
                    }
                    appState.committedScanData.allFilesList.push({
                        name: name, path: filePath, size: fileState.content.length,
                        extension: extension, type: 'file', depth: depth, entryHandle: null
                    });
                }
            }
        });
        if (appState.committedScanData.allFilesList) {
           appState.committedScanData.allFilesList.sort((a,b) => a.path.localeCompare(b.path));
        }
    }

    appState.selectionCommitted = true;
    if (typeof uiManager.refreshAllUI === 'function') uiManager.refreshAllUI(); 
    
    if(currentSelectedPaths.size > 0) {
        notificationSystem.showNotification("Selections committed successfully");
    } else if (appState.fullScanData.allFilesList && appState.fullScanData.allFilesList.length === 0) {
        notificationSystem.showNotification("No items to commit (project might be empty or selection is empty).");
    }
}

function clearProjectData() {
    notificationSystem.showNotification("Project data cleared.", {duration: 2000});
    resetUIForProcessing("DROP A FOLDER OR SELECT ONE TO BEGIN."); 
    if(elements.loader) elements.loader.classList.remove('visible');
    if(elements.mainActionDiv && elements.mainActionDiv.style) elements.mainActionDiv.style.display = 'flex';
    if (elements.aiDebriefingAssistantBtn) elements.aiDebriefingAssistantBtn.disabled = true;
}

function copyReport() {
    if (elements.textOutputEl && elements.textOutputEl.textContent && elements.textOutputEl.textContent.trim() !== "" && !elements.textOutputEl.textContent.startsWith("// NO DATA AVAILABLE") && !elements.textOutputEl.textContent.startsWith("// NO ITEMS IN CURRENT VIEW")) {
        navigator.clipboard.writeText(elements.textOutputEl.textContent)
            .then(() => notificationSystem.showNotification('Report copied to clipboard!'))
            .catch(err => { console.error('Failed to copy report: ', err); errorHandler.showError({ name: "ClipboardError", message: "Failed to copy to clipboard.", stack: err.stack }); });
    } else { notificationSystem.showNotification('No report generated or report is empty.'); }
}

function initApp() {
    populateElements();

    notificationSystem.initNotificationSystem();
    errorHandler.initErrorHandlers();
    fileEditor.initFileEditor();
    aiPatcher.initAiPatcher();
    scaffoldImporter.initScaffoldImporter();
    aiDebriefingAssistant.initAiDebriefingAssistant(); // Initialize new module
    uiManager.initTabs(); 
    sidebarResizer.initResizer(elements.leftSidebar, elements.sidebarResizer, elements.mainView);


    document.body.className = '';

    if (elements.leftSidebar) elements.leftSidebar.style.display = 'flex';
    if (elements.mainActionDiv) elements.mainActionDiv.style.display = 'flex';
    if (elements.importAiScaffoldBtn) elements.importAiScaffoldBtn.style.display = 'block';
    if (elements.copyScaffoldPromptBtn) elements.copyScaffoldPromptBtn.style.display = 'block';

    if (elements.visualOutputContainer) elements.visualOutputContainer.style.display = 'none';
    if (elements.treeViewControls) elements.treeViewControls.style.display = 'none';
    if (elements.generalActions) elements.generalActions.style.display = 'flex'; // Keep general actions visible


    if (elements.mainView) elements.mainView.style.display = 'flex';
    if (elements.rightStatsPanel) elements.rightStatsPanel.style.display = 'none';

    if (elements.mainViewTabs) elements.mainViewTabs.style.display = 'flex';
    if (elements.tabContentArea) elements.tabContentArea.style.display = 'flex';
    if (elements.fileEditor) elements.fileEditor.style.display = 'none'; 

    if (elements.tabContentArea) {
        elements.tabContentArea.querySelectorAll('.tab-content-item').forEach(tc => {
             tc.classList.remove('active');
             tc.style.display = 'none';
        });
    }
    if (elements.mainViewTabs) {
        elements.mainViewTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    }
    appState.activeTabId = 'textReportTab'; 
    if (typeof uiManager.activateTab === 'function') {
        uiManager.activateTab(appState.activeTabId);
    }


    const modalsToHideOnInit = [
        elements.filePreview, elements.errorReport,
        elements.aiPatchDiffModal, elements.scaffoldImportModal,
        elements.aiDebriefingAssistantModal // Add new modal here
    ];
    modalsToHideOnInit.forEach(panel => { if (panel && panel.style) panel.style.display = 'none'; });

    if (elements.treeContainer) elements.treeContainer.innerHTML = '<div class="empty-notice">DROP A FOLDER OR SELECT ONE TO BEGIN.</div>';
    if (elements.loader) elements.loader.classList.remove('visible');


    disableUIControls();
    if (elements.importAiScaffoldBtn) elements.importAiScaffoldBtn.disabled = false;
    if (elements.copyScaffoldPromptBtn) elements.copyScaffoldPromptBtn.disabled = false;
    if (elements.clearProjectBtn) elements.clearProjectBtn.disabled = true;
    if (elements.aiDebriefingAssistantBtn) elements.aiDebriefingAssistantBtn.disabled = true; // Disabled until project loaded


    setupEventListeners();

    if (elements.pageLoader) elements.pageLoader.classList.add('hidden');
    document.body.classList.add('loaded');

    appState.initialLoadComplete = true;
    console.log("DirAnalyse Matrix Initialized. Main view editor and new button logic active.");
}

// --- Snapshot Functions ---

async function createSaveState() {
    if (!appState.fullScanData || !appState.fullScanData.allFilesList) return;

    notificationSystem.showNotification("Creating session snapshot...", { duration: 1500 });
    const snapshot = new Map();
    for (const fileInfo of appState.fullScanData.allFilesList) {
        try {
            // Read file content, which will be ArrayBuffer for binary, text for others
            const content = await fileSystem.readFileContent(fileInfo.entryHandle, fileInfo.path, true);
            snapshot.set(fileInfo.path, content);
        } catch (err) {
            console.warn(`Could not read file for snapshot: ${fileInfo.path}`, err);
        }
    }
    appState.saveState = snapshot;

    if (elements.restoreStateBtn) elements.restoreStateBtn.disabled = false;
    if (elements.saveStateStatus) {
        elements.saveStateStatus.textContent = `Snapshot created at ${new Date().toLocaleTimeString()}`;
    }
    console.log(`Snapshot created with ${appState.saveState.size} files.`);
}

async function restoreSaveState() {
    if (!appState.saveState || appState.saveState.size === 0) {
        notificationSystem.showNotification("No snapshot available to restore.", { duration: 3000 });
        return;
    }
    if (!confirm("This will revert ALL files in the project to their state when you first loaded them. Are you sure?")) {
        return;
    }

    notificationSystem.showNotification("Restoring all files from snapshot...", { duration: 3000 });
    let restoreCount = 0;
    let errorCount = 0;

    for (const [path, content] of appState.saveState.entries()) {
        try {
            await fileSystem.writeFileContent(appState.directoryHandle, path, content);
            
            // Also update the in-memory editor cache to reflect the restore
            fileEditor.updateFileInEditorCache(path, content, content, false);
            restoreCount++;
        } catch (err) {
            errorCount++;
            console.error(`Failed to restore file: ${path}`, err);
        }
    }

    if (errorCount > 0) {
        errorHandler.showError({ name: "RestoreError", message: `Failed to restore ${errorCount} files. Check console.` });
    } else {
        notificationSystem.showNotification(`Successfully restored ${restoreCount} files. Reloading the app is recommended.`, { duration: 5000 });
    }

    // It's good practice to recommend a reload to ensure the UI fully reflects the restored state.
    // You could even force it with: location.reload();
}
document.addEventListener('DOMContentLoaded', initApp);
// --- ENDFILE: js/main.js --- //