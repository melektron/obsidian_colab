import { App, Editor, editorEditorField, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from 'obsidian';
import { ViewPlugin, EditorView, ViewUpdate, PluginValue } from "@codemirror/view"
import { EditorState, Extension } from '@codemirror/state';
import * as random from "lib0/random";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import { yCollab } from 'y-codemirror.next';
import { debug } from 'console';


let last_editor_view: EditorView | undefined = undefined;
let last_editor_state: EditorState | undefined = undefined;
let editor_count: number = 0;
let global_plugin_inst: ObsidianCollabPlugin;

class DockSizeViewPlugin implements PluginValue {
    editor_num: number;
    dom: HTMLDivElement;

    constructor(view: EditorView) {
        this.editor_num = editor_count;
        editor_count++;

        this.dom = view.dom.appendChild(document.createElement("div"));
        this.dom.style.cssText = `
            position: absolute; 
            inset-block-start: 2px;
            inset-inline-end: 5px;
            padding: 5px;
            background: red;
        `;
        this.dom.textContent = view.state.doc.length + "";
        this.logw("Plugin initialized with this text: ", view.state.doc);
        this.logw("and file: ", global_plugin_inst.app.workspace.getActiveFile());

        // TODO: make the initial value match the one in the CRTD and optionally merge them
        // TODO: investigate: maybe there is an alternative path where the file content is loaded only later?
        //debugger;
    }

    update(update: ViewUpdate) {
        if (update.docChanged) {
            this.loge("Doc changed.", update.changes);
            this.dom.textContent = update.state.doc.length + "";
        }
        
        if (last_editor_state !== update.startState) {
            this.logi("new state: ", update.state);
            last_editor_state = update.state;
        } else {
            this.logd("next state: ", update.state);
            last_editor_state = update.state;
        }

        if (last_editor_view !== update.view) {
            this.logw("new view: ", update.view);
            last_editor_view = update.view;
        }
    }

    destroy() {
        this.logw("plugin deleted");
        this.dom.remove();
    }

    logd(...stuff: any[]) {
        console.log("ED[%d]: ", this.editor_num, ...stuff);
    }
    logi(...stuff: any[]) {
        console.info("ED[%d]: ", this.editor_num, ...stuff);
    }
    logw(...stuff: any[]) {
        console.warn("ED[%d]: ", this.editor_num, ...stuff);
    }
    loge(...stuff: any[]) {
        console.error("ED[%d]: ", this.editor_num, ...stuff);
    }
}
const docSizePlugin = ViewPlugin.fromClass(DockSizeViewPlugin);


// Remember to rename these classes and interfaces!

interface CollabSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: CollabSettings = {
    mySetting: 'default'
}

export default class ObsidianCollabPlugin extends Plugin {
    settings: CollabSettings;
    lastEditor: Editor | undefined;
    editor_extensions: Extension[];


    
    async onload() {
        global_plugin_inst = this;
        await this.loadSettings();
        //this.app.emulateMobile();   // @ts-ignore


        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-sample-modal-simple',
            name: 'Open sample modal (simple)',
            callback: () => {
                new SampleModal(this.app).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Sample editor command',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sample Editor Command2');
            }
        });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Open sample modal (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new SampleModal(this.app).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new CollabSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        //this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
        //	console.log('click', evt);
        //});

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        //this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));



        // listen to file creations, deletions and changes for sending to the server
        // This needs to be done after app is loaded as it is also called while all files are loaded
        // https://docs.obsidian.md/Plugins/Guides/Optimizing+plugin+load+time#Listening+to+%60vault.on('create')%60
        this.app.workspace.onLayoutReady(() => {
            this.registerEvent(this.app.vault.on('create', this.onCreate, this));
            this.registerEvent(this.app.vault.on('delete', this.onDelete, this));
            this.registerEvent(this.app.vault.on('modify', this.onModify, this));
            this.registerEvent(this.app.vault.on('rename', this.onRename, this));
        });

        this.lastEditor = undefined;

        //this.app.workspace.on("quick-preview", (file, data) => {
        //    console.log("quick-preview:", file, data);
        //    //statusBarItemEl.setText("hi");
        //});
        this.app.workspace.on("editor-change", (editor, info) => {
            console.log("editor-change:", editor, info);
            //statusBarItemEl.setText("hi");
        });
        this.app.workspace.on("file-open", (file: TFile) => {
            console.log("file-opened:", file);
            if (this.lastEditor === this.app.workspace.activeEditor?.editor) {
                console.log("same editor");
            }
            else {
                this.lastEditor = this.app.workspace.activeEditor?.editor;
                console.log("different editor:", this.lastEditor);
            }
        });
        //this.app.workspace.on("window-open")

        this.app.workspace.on("active-leaf-change", (leaf) => {
            console.log("active-leaf-change:", leaf);
        });

        //this.app.workspace.activeEditor?.editor?.

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            //new Notice('This is a notice!');
            console.log("\nleavesa:")
            this.app.workspace.iterateRootLeaves((leaf) => {
                console.log(leaf);
            });
            //console.log(this.);
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');



                
        const usercolors = [
            { color: '#30bced', light: '#30bced33' },
            { color: '#6eeb83', light: '#6eeb8333' },
            { color: '#ffbc42', light: '#ffbc4233' },
            { color: '#ecd444', light: '#ecd44433' },
            { color: '#ee6352', light: '#ee635233' },
            { color: '#9ac2c9', light: '#9ac2c933' },
            { color: '#8acb88', light: '#8acb8833' },
            { color: '#1be7ff', light: '#1be7ff33' }
        ]

        // select a random color for this user
        const userColor = usercolors[random.uint32() % usercolors.length]

        //const doc = new Y.Doc()
        //doc.on("update", (arg0, arg1, arg2) => {
        //    console.warn("doc update: ", arg0, arg1, arg2);
        //});
        //const ytext = doc.getText('codemirror')
        //ytext.observe((a) => {
        //    console.log("new val: ", ytext.toString());
        //});

        //const provider = new WebsocketProvider('ws://hetzner2.ecbb.cc:12345', 'my-room', doc, { disableBc: true })

        //const undoManager = new Y.UndoManager(ytext)
        //undoManager.on("stack-item-added", (arg0) => {})
        //let awareness = new awarenessProtocol.Awareness(doc);
        //
        //awareness.setLocalStateField('user', {
        //    name: 'Anonymous ' + Math.floor(Math.random() * 100),
        //    color: userColor.color,
        //    colorLight: userColor.light
        //})



        this.editor_extensions = [
            docSizePlugin,
            //yCollab(ytext, undefined, { undoManager: false })
        ];
        this.registerEditorExtension(this.editor_extensions);

    }

    onunload() {

    }

    onCreate(file: TAbstractFile) {
        console.log("create:", file);
    }
    onDelete(file: TAbstractFile) {
        console.log("delete:", file);
    }
    onModify(file: TAbstractFile) {
        console.log("modify:", file);
    }
    onRename(file: TAbstractFile, old_path: string) {
        console.log(`rename '${old_path}'->'${file.path}':`, file);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class CollabSettingTab extends PluginSettingTab {
    plugin: ObsidianCollabPlugin;

    constructor(app: App, plugin: ObsidianCollabPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
