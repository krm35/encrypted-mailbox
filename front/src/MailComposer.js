import React, {useEffect, useState} from "react";
import {Button, Dialog, EditableText, FileInput, Icon, MenuDivider, Tag} from "@blueprintjs/core";
import * as Classes from "@blueprintjs/core/lib/cjs/common/classes";
import MailComposer from "nodemailer/lib/mail-composer";
import {Encrypter} from "nodemailer-openpgp";
import {HTTPClient} from "./HTTPClient";
import {arrayBufferToBuffer, decryptMail, getKey, replaceAll, toast} from "./utilities";
import KeyViewer from "./KeyViewer";
import FileSaver from 'file-saver';
import DraftAlert from "./DraftAlert";


function getSubject(mail) {
    if (!mail) return "";
    const subject = mail.subject || "";
    if (mail.composeType === "reply" && !subject.toUpperCase().startsWith("RE:")) return "RE: " + subject;
    if (mail.composeType === "forward" && !subject.startsWith("FWD:")) return "FWD: " + subject;
    return subject;
}

function getTo(mail) {
    if (!mail || !mail.to || mail.composeType === "forward") return [];
    if (mail.composeType === "reply") return mail.from.text.split(' ');
    return mail.to.text.split(' ');
}

export default function MailViewer(props) {
    const [text, setText] = useState(props.mail ? (props.mail.text || "") : "");
    const [subject, setSubject] = useState(getSubject(props.mail));
    const [to, setTo] = useState(getTo(props.mail));
    const [cc, setCc] = useState([]);
    const [bcc, setBcc] = useState([]);
    const [attachments, setAttachments] = useState(props.mail ? props.mail.attachments : []);
    const [loader, setLoader] = useState(null);
    const [publicKey, setPublicKey] = useState(null);
    const [keyViewerOpen, setKeyViewerOpen] = useState(null);
    const [focus, setFocus] = useState(null);
    const [alert, setAlert] = useState(null);

    if (props.mail) decryptMail(props.mail, props.setMail, "drafts", setText, setAttachments);

    useEffect(() => {
        setTimeout(() => {
            const mailContentDiv = document.getElementById("mail-content");
            if (focus || !props.mail || props.mail.draft || !mailContentDiv) return;
            if (mailContentDiv.parentElement.childNodes[0].tagName === "TEXTAREA") {
                mailContentDiv.parentElement.childNodes[0].setSelectionRange(0, 0);
                setFocus(true);
            }
        }, 0);
    });

    function encrypt(message, encryptionKeys) {
        if (!encryptionKeys) return message;
        return new Promise((resolve, reject) => {
            try {
                const chunks = [];
                const signer = new Encrypter({encryptionKeys});
                signer.on('data', chunk => chunks.push(chunk));
                signer.on('err', err => reject(err));
                signer.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
                signer.end(message);
            } catch (e) {
                reject(e);
            }
        });
    }

    function saveDraft() {
        send(true);
    }

    async function deleteDraft() {
        try {
            setLoader("delete-draft");
            await HTTPClient.delete("/delete-draft?id=" + props.mail._id);
            setLoader(null);
            props.setMail(null);
            props.setCompose(null);
        } catch (e) {
        }
    }

    function send(draft) {
        setLoader(draft ? "draft" : "send");
        const mail = new MailComposer({
            from: getKey("email"),
            to,
            cc,
            bcc,
            subject,
            html: draft ? text : replaceAll(text, "\n", "<br/>"),
            attachments: Array.from(attachments).filter(a => {
                if (!a.contentType) a.content = arrayBufferToBuffer(a.content);
                a.contentType = "application/octet-stream";
                return a.valid !== null
            })
        });
        mail['compile']()['build'](async (err, message) => {
            if (err) {
                console.log(err);
                toast("Something went wrong");
                return setLoader(null);
            }
            try {
                const signingKey = draft ? getKey("armoredPublicKey") : publicKey;
                const action = draft ? ("draft" + (props?.mail?.draft ? "&id=" + props.mail._id : "")) :
                    ("send" + (props.mail && !props.mail.composeType ? "&id=" + props.mail._id : ""));
                await sendMail(!signingKey ? message : await encrypt(message, [signingKey]), action);
                if (publicKey && !draft) {
                    await sendMail(await encrypt(message, [getKey("armoredPublicKey")]), "copy");
                }
            } catch (e) {
                console.log(e);
                toast("Something went wrong");
                setLoader(null);
            }
        });
    }

    async function sendMail(message, action) {
        HTTPClient.post("/upload?action=" + action, message)
            .then(res => {
                const {error, data} = res.data;
                if (props.setMail) props.setMail(null);
                setLoader(null);
                if (error) return toast(data);
                props.setCompose(null);
                if (action !== "copy") {
                    toast(action.startsWith("draft") ? "Draft saved" : "Email sent", "success");
                }
            })
            .catch((e) => {
                console.log("error", e);
                toast("Something went wrong");
                setLoader(null);
            })
    }

    return <div>
        <Dialog
            title={"Compose an email"}
            isOpen={true}
            onClose={() => {
                if (props.mail) props.mail.closed = true;
                if (subject?.length || text?.length) return setAlert(true);
                if (props.setMail) props.setMail(null);
                props.setCompose(null)
            }}
            style={{width: "60%"}}
        >
            <div className={Classes.DIALOG_BODY}>
                {[["To", to, setTo], ["Cc", cc, setCc],
                    ["Bcc", bcc, setBcc], ["Subject", subject, setSubject]].map(value =>
                    <div key={value[0]}>
                        <EditableText
                            className={"fill"}
                            placeholder={value[0]}
                            value={value[0] === "Subject" ? value[1] : value[1].join(' ')}
                            onChange={e => value[2](value[0] === "Subject" ? e : replaceAll(e, ',', ' ').split(' '))}
                        />
                        <MenuDivider/>
                    </div>
                )}
                <br/>
                <EditableText
                    className={"mail-content"}
                    contentId={"mail-content"}
                    placeholder="Write your email"
                    multiline={true}
                    minLines={10}
                    value={text}
                    onChange={e => setText(e)}
                    isEditing={props.mail && props.mail.text !== undefined}
                />
                <div style={{marginTop: "3px"}}>
                    {Array.from(attachments).map((a, i) => {
                        if (a.valid === null) return null;
                        return <Tag
                            style={{margin: "3px"}}
                            key={i}
                            round={true}
                            icon={<Icon
                                icon={"floppy-disk"}
                                onClick={() => FileSaver['saveAs'](new Blob([a.content], {type: "application/octet-stream"}), a.filename)}
                            />}
                            onRemove={() => {
                                attachments[i].valid = null;
                                setAttachments([...attachments]);
                            }}
                        >{a.filename}</Tag>;
                    })}
                </div>
                <div style={{display: "none"}}>
                    <FileInput
                        inputProps={{id: "attachments", multiple: true}}
                        onInputChange={(e) => {
                            const {files} = e.target;
                            for (let f = 0; f < files.length; f++) {
                                const reader = new FileReader();
                                reader.addEventListener("load", () => {
                                    attachments.push({
                                        filename: files[f].name,
                                        content: arrayBufferToBuffer(reader.result),
                                        contentType: "application/octet-stream"
                                    });
                                    setAttachments([...attachments]);
                                }, false);
                                reader.readAsArrayBuffer(files[f]);
                            }
                        }}
                    />
                </div>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button
                        outlined={true}
                        text={"Attachments"}
                        rightIcon={"paperclip"}
                        onClick={() => document.getElementById("attachments").click()}
                    />
                    {!attachments.filter(a => a.valid !== null && a.filename === "public.asc").length && <Button
                        outlined={true}
                        text={"Attach public key"}
                        rightIcon={"key"}
                        onClick={() => {
                            const filename = "public.asc";
                            attachments.push({
                                filename,
                                content: new TextEncoder().encode(getKey("armoredPublicKey")),
                                contentType: "application/octet-stream"
                            });
                            setAttachments([...attachments]);
                        }}
                    />}
                    <Button
                        outlined={true}
                        text={"PGP Encrypt"}
                        rightIcon={"shield"}
                        onClick={() => setKeyViewerOpen(true)}
                    />
                    {props.mail && <Button
                        outlined={true}
                        text={"Delete draft"}
                        loading={loader === "draft"}
                        rightIcon={"trash"}
                        onClick={() => deleteDraft()}
                    />}
                    <Button
                        outlined={true}
                        text={"Save draft"}
                        loading={loader === "draft"}
                        rightIcon={"floppy-disk"}
                        onClick={() => saveDraft()}
                    />
                    <Button
                        outlined={true}
                        text={"Send"}
                        loading={loader === "send"}
                        rightIcon={"send-message"}
                        onClick={() => send()}
                    />
                </div>
            </div>
        </Dialog>
        <KeyViewer _key={publicKey} setKey={setPublicKey} keyViewerOpen={keyViewerOpen}
                   setKeyViewerOpen={setKeyViewerOpen}/>
        <DraftAlert
            onConfirm={saveDraft}
            alert={alert}
            setAlert={setAlert}
            onCancel={() => {
                if (props.setMail) props.setMail(null);
                props.setCompose(null)
            }}
        />
    </div>
}