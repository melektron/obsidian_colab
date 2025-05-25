/*
ELEKTRON © 2025 - now
Written by melektron
www.elektron.work
25.05.25, 18:58

Global access to the plugin instance
*/

import type ObsidianCollabPlugin from "./main";


export let go: {
    plugin_inst: ObsidianCollabPlugin
} = {
    // @ts-expect-error 
    plugin_inst: undefined
};