/*
ELEKTRON © 2025 - now
Written by melektron
www.elektron.work
25.05.25, 19:13

Plugin Settings
*/


import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianCollabPlugin from "./main"


export interface CollabSettings {
    mySetting: string;
}

export const DEFAULT_SETTINGS: CollabSettings = {
    mySetting: "default"
}


export class CollabSettingTab extends PluginSettingTab {
    plugin: ObsidianCollabPlugin;

    constructor(app: App, plugin: ObsidianCollabPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("Setting #1")
            .setDesc("It\"s a secret")
            .addText(text => text
                .setPlaceholder("Enter your secret")
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}