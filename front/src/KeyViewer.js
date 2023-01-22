import React from "react";
import {Button, Dialog, EditableText, FileInput} from "@blueprintjs/core";
import * as Classes from "@blueprintjs/core/lib/cjs/common/classes";

export default function KeyViewer(props) {
    return <Dialog
        title={props.title || "Public key"}
        isOpen={props.keyViewerOpen}
        onClose={() => props.setKeyViewerOpen(null)}
    >
        <div className={Classes.DIALOG_BODY}>
            <EditableText
                placeholder="Paste the public key"
                multiline={true}
                minLines={25}
                value={props._key}
                onChange={!props.setKey ? null : e => props.setKey(e)}
            />
        </div>
        {props.setKey && <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <div style={{display: "none"}}>
                    <FileInput
                        inputProps={{id: "key-to-import"}}
                        onInputChange={(e) => {
                            const reader = new FileReader();
                            reader.addEventListener("load", () => {
                                props.setKey(reader.result)
                            }, false);
                            reader.readAsText(e.target.files[0]);
                        }}
                    />
                </div>
                <Button
                    outlined={true}
                    text={"Import key from file"}
                    rightIcon={"import"}
                    onClick={() => document.getElementById("key-to-import").click()}
                />
            </div>
        </div>}
    </Dialog>
}