/*
ELEKTRON © 2025 - now
Written by melektron
www.elektron.work
25.05.25, 20:37

This code is a modified version of the code found on https://github.com/yjs/y-codemirror.next
licensed under the conditions of the MIT License (see README.md of this project)
*/

import * as Y from 'yjs'


/**
 * Defines a range on text using relative positions that can be transformed back to
 * absolute positions. (https://docs.yjs.dev/api/relative-positions)
 */
export class YRange {
    yanchor: Y.RelativePosition;
    yhead: Y.RelativePosition;
    
    constructor(
        yanchor: Y.RelativePosition, 
        yhead: Y.RelativePosition
    ) {
        this.yanchor = yanchor
        this.yhead = yhead
    }

    toJSON() {
        return {
            yanchor: Y.relativePositionToJSON(this.yanchor),
            yhead: Y.relativePositionToJSON(this.yhead)
        }
    }

    static fromJSON(json: any) {
        return new YRange(
            Y.createRelativePositionFromJSON(json.yanchor), 
            Y.createRelativePositionFromJSON(json.yhead)
        )
    }
}
