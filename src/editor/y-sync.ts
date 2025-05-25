/*
ELEKTRON © 2025 - now
Written by melektron
www.elektron.work
25.05.25, 21:04

This code is a modified version of the code found on https://github.com/yjs/y-codemirror.next
licensed under the conditions of the MIT License (see README.md of this project)
*/

import * as Y from 'yjs'
import * as cm_state from '@codemirror/state' // eslint-disable-line
import * as cm_view from '@codemirror/view' // eslint-disable-line
import { YRange } from './y-range.js'
import { Awareness } from 'y-protocols/awareness.js';


export class YSyncConfig {
    ytext: Y.Text;
    awareness: Awareness;
    undoManager: Y.UndoManager;

    constructor(ytext: Y.Text, awareness: Awareness) {
        this.ytext = ytext
        this.awareness = awareness
        this.undoManager = new Y.UndoManager(ytext)
    }

    /**
     * Helper function to transform an absolute index position to a Yjs-based relative position
     * (https://docs.yjs.dev/api/relative-positions).
     *
     * A relative position can be transformed back to an absolute position even after the document has changed. The position is
     * automatically adapted. This does not require any position transformations. Relative positions are computed based on
     * the internal Yjs document model. Peers that share content through Yjs are guaranteed that their positions will always
     * synced up when using relatve positions.
     *
     * ```js
     * import { ySyncFacet } from 'y-codemirror'
     *
     * ..
     * const ysync = view.state.facet(ySyncFacet)
     * // transform an absolute index position to a ypos
     * const ypos = ysync.getYPos(3)
     * // transform the ypos back to an absolute position
     * ysync.fromYPos(ypos) // => 3
     * ```
     *
     * It cannot be guaranteed that absolute index positions can be synced up between peers.
     * This might lead to undesired behavior when implementing features that require that all peers see the
     * same marked range (e.g. a comment plugin).
     *
     */
    toYPos(pos: number, assoc: number = 0) {
        return Y.createRelativePositionFromTypeIndex(this.ytext, pos, assoc)
    }

    fromYPos(rpos: Y.RelativePosition) {
        const pos = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(rpos), this.ytext.doc!)
        if (pos == null || pos.type !== this.ytext) {
            throw new Error('[y-codemirror] The position you want to retrieve was created by a different document')
        }
        return {
            pos: pos.index,
            assoc: pos.assoc
        }
    }

    toYRange(range: cm_state.SelectionRange) {
        const assoc = range.assoc
        const yanchor = this.toYPos(range.anchor, assoc)
        const yhead = this.toYPos(range.head, assoc)
        return new YRange(yanchor, yhead)
    }

    fromYRange(yrange: YRange) {
        const anchor = this.fromYPos(yrange.yanchor)
        const head = this.fromYPos(yrange.yhead)
        if (anchor.pos === head.pos) {
            return cm_state.EditorSelection.cursor(head.pos, head.assoc)
        }
        return cm_state.EditorSelection.range(anchor.pos, head.pos)
    }
}


export const ySyncFacet = cm_state.Facet.define<YSyncConfig, YSyncConfig>({
    combine(inputs) {
        return inputs[inputs.length - 1]
    }
})

/**
 * @type {cm_state.AnnotationType<YSyncConfig>}
 */
export const ySyncAnnotation = cm_state.Annotation.define<YSyncConfig>()

/**
 * @extends {PluginValue}
 */
class YSyncPluginValue {
    view: cm_view.EditorView;
    conf: YSyncConfig;
    #ytext: Y.Text;
    #observer

    constructor(view: cm_view.EditorView) {
        this.view = view
        this.conf = view.state.facet(ySyncFacet)

        this.#observer = (event: Y.YTextEvent, transaction: Y.Transaction) => {
            if (transaction.origin !== this.conf) {
                const delta = event.delta
                const changes = []
                let pos = 0
                for (let i = 0; i < delta.length; i++) {
                    const d = delta[i]
                    if (d.insert != null) {
                        changes.push({ from: pos, to: pos, insert: d.insert })
                    } else if (d.delete != null) {
                        changes.push({ from: pos, to: pos + d.delete, insert: '' })
                        pos += d.delete
                    } else {
                        pos += d.retain
                    }
                }
                view.dispatch({ changes, annotations: [ySyncAnnotation.of(this.conf)] })
            }
        }
        this.#ytext = this.conf.ytext
        this.#ytext.observe(this.#observer)
    }

    /**
     * @param {cm_view.ViewUpdate} update
     */
    update(update: cm_view.ViewUpdate) {
        if (!update.docChanged || (update.transactions.length > 0 && update.transactions[0].annotation(ySyncAnnotation) === this.conf)) {
            return
        }
        const ytext = this.conf.ytext
        ytext.doc!.transact(() => {
            /**
             * This variable adjusts the fromA position to the current position in the Y.Text type.
             */
            let adj = 0
            update.changes.iterChanges((fromA, toA, fromB, toB, insert) => {
                const insertText = insert.sliceString(0, insert.length, '\n')
                if (fromA !== toA) {
                    ytext.delete(fromA + adj, toA - fromA)
                }
                if (insertText.length > 0) {
                    ytext.insert(fromA + adj, insertText)
                }
                adj += insertText.length - (toA - fromA)
            })
        }, this.conf)
    }

    destroy() {
        this.#ytext.unobserve(this.#observer)
    }
}

export const ySync = cm_view.ViewPlugin.fromClass(YSyncPluginValue)
