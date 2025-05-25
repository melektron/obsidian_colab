

import { addIcon, Notice, setIcon } from "obsidian";
import { createDeleteSetFromStructStore } from "yjs";
import { h } from "dom-chef";

interface IconProps {
    iconId: string
    style: React.CSSProperties
};

const Icon = (props: IconProps) => {
    let ret = <div style={{
        width: "var(--icon-size)",
        height: "var(--icon-size)"
    }} />
    // we do a questionable botch to override the setAttribute method because props
    // are not actually passed to components in "dom-chef". We only get the defaults
    // if specified, the others are instead applied using "setAttribute"
    const old_setAttribute = ret.setAttribute
    ret.setAttribute = (qualifiedName: string, value: string) => {
        console.log("got attribute: ", value)
        if (qualifiedName === "iconId")
            setIcon(ret, value);
        else
            old_setAttribute(qualifiedName, value);
    }
    return ret;
}

export class ErrorNotice extends Notice {
    constructor(message: string | DocumentFragment) {

        let element = <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center"
        }}>
            <Icon iconId="triangle-alert" style={{
                marginRight: "0.3rem"
            }} />
            <span className="collab_error_notice">
                {message}
            </span>
        </div>;

        super(element, 0);
    }
}