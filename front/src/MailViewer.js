import React, {useState} from "react";
import {Button, Dialog, EditableText, MenuDivider, Spinner, Tag} from "@blueprintjs/core";
import * as Classes from "@blueprintjs/core/lib/cjs/common/classes";
import DOMPurify from 'dompurify'
import {decryptMail} from "./utilities";
import FileSaver from 'file-saver';
import {detectMimeType} from "./mime-types";

export default function MailViewer(props) {
    const {mail, setMail} = props;
    const [raw, setRaw] = useState(false);
    decryptMail(mail, setMail, props.tabId.toLowerCase());
    return <Dialog
        title={mail.subject}
        isOpen={mail !== null}
        onClose={() => setMail(null)}
        style={{width: "60%"}}
    >
        <div className={Classes.DIALOG_BODY}>
            {["from", "to", "cc", "bcc"].map(value => {
                if (!mail[value]) return null;
                return <div key={value}>
                    <EditableText
                        disabled={true}
                        className={"fill"}
                        placeholder={value}
                        value={value + ": " + mail[value].text}
                    />
                    <MenuDivider/>
                </div>
            })}
            <br/>
            {!mail.decrypted ? <Spinner/> :
                <div
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(raw ? JSON.stringify(mail.decrypted) : mail.textAsHtml)
                    }}
                />
            }
        </div>
        <div style={{marginTop: "3px"}}>
            {Array.from(mail.attachments).map((a, i) =>
                <Tag
                    style={{margin: "3px", cursor: "pointer"}}
                    key={i}
                    round={true}
                    icon={"floppy-disk"}
                    onClick={() => FileSaver['saveAs'](new Blob([a.content], {type: detectMimeType(a.filename)}), a.filename)}
                >
                    {a.filename}
                </Tag>
            )}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <Button
                    outlined={true}
                    text={"View as " + (raw ? "email" : "raw")}
                    rightIcon={"application"}
                    onClick={() => setRaw(!raw)}
                />
                {/*<Button*/}
                {/*    outlined={true}*/}
                {/*    text={"Reply"}*/}
                {/*    rightIcon={"send-message"}*/}
                {/*    onClick={() => {*/}

                {/*    }}*/}
                {/*/>*/}
            </div>
        </div>
    </Dialog>
}