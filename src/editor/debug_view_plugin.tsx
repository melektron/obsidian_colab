/*
ELEKTRON © 2025 - now
Written by melektron
www.elektron.work
25.05.25, 19:02

CodeMirror view plugin used for debugging
*/

import { TFile } from 'obsidian';
import * as cm_view from "@codemirror/view";
import * as cm_state from '@codemirror/state';
import { h } from "dom-chef" ;

import { ErrorNotice } from "../components";
import { go } from "../plugin_inst";


let editor_count: number = 0;


class DebugStateField {
    editor_num: number;
    file: TFile;
    // TODO: ydoc: Y.Doc,

    constructor(state: cm_state.EditorState) {
        // initialize editor ID for debugging
        this.editor_num = editor_count++;

        // figure out what file the editor has opened.
        // This constructor is called when the EditorView is initialized with
        // the EditorState, at which point the active file has been set to the
        // right value. TODO: there might be edge cases when an editor is 
        // created but the file is not updated yet, maybe check that...
        let file = go.plugin_inst.app.workspace.getActiveFile();
        if (file === null) {
            new ErrorNotice("Collab could not determine which file was opened. This editor will not be synced.");
            throw Error("getActiveFile() failed");
        }
        this.file = file

        this.logw("New Editor with file: ", this.file);
        this.logw("and text: ", state.doc.toString());

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
};
export const debugStateField = cm_state.StateField.define<DebugStateField | undefined>({

    create(state) {
        try {
            return new DebugStateField(state);
        } catch (error) {
            console.error(error);
            return undefined;
        }
    },

    update(value, tr) { 
        return value;
    }
})


export class DebugViewPlugin implements cm_view.PluginValue {
    view: cm_view.EditorView;

    counter_element: HTMLElement;
    
    constructor(view: cm_view.EditorView) {
        let field = view.state.field(debugStateField, false);
        if (field === undefined) return;
        this.view = view;

        field.logw("hello from view plugin");

        // add our custom elements to the editor
        this.counter_element = view.dom.appendChild(
            <div style={{
                position: "absolute", 
                insetBlockStart: "2px",
                insetBlockEnd: "5px",
                padding: "5px",
                background: "red",
                right: 0,
                top: 0,
                maxHeight: "100px"
            }}>
                {view.state.doc.length + ""}
            </div>
        );

        // TODO: make the initial value match the one in the CRTD and optionally merge them
        // TODO: investigate: maybe there is an alternative path where the file content is loaded only later?
        //debugger;
    }

    update(update: cm_view.ViewUpdate) {
        let field = update.state.field(debugStateField, false);
        if (field === undefined) return;

        if (update.docChanged) {
            field.loge("Doc changed.", update.changes);
            this.counter_element.textContent = update.state.doc.length + "";
        }
    }

    destroy() {
        let field = this.view.state.field(debugStateField, false);
        if (field !== undefined) {
            field.logw("plugin deleted");
            // in the future unregister the editor here
        }

        // always delete this if it exists
        if (this.counter_element)
            this.counter_element.remove();
    }

}
export const debugViewPlugin = cm_view.ViewPlugin.fromClass(DebugViewPlugin);

