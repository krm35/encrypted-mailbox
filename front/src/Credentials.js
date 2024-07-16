import React, {useState} from "react";
import {Button, Dialog, FormGroup, InputGroup} from "@blueprintjs/core";
import * as Classes from "@blueprintjs/core/lib/cjs/common/classes";
import {HTTPClient} from "./HTTPClient";
import {getKey, setKey, toast} from "./utilities";
import FileSaver from "file-saver";

const {createMessage, decrypt, encrypt, readMessage} = window.openpgp;

export default function Credentials(props) {

    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [type, setType] = useState("password");
    const [loading, setLoading] = useState(false);

    async function checkPassword() {
        const {data: passphrase} = await decrypt({
            message: await readMessage({armoredMessage: getKey("encryptedPassphrase")}),
            passwords: [password]
        });
        return await encrypt({
            message: await createMessage({text: passphrase}),
            passwords: [newPassword]
        });
    }

    async function update() {
        try {
            setLoading(true);
            const encryptedPassphrase = await checkPassword();
            HTTPClient.post('/password', {
                currentEncryptedPassphrase: getKey("encryptedPassphrase"),
                encryptedPassphrase
            })
                .then(async (result) => {
                    setLoading(false);
                    const {error, data} = result.data;
                    if (error) return toast(data);
                    props.setCredentials(null);
                    setKey("encryptedPassphrase", encryptedPassphrase);
                    toast("PASSWORD UPDATED", "success");
                }).catch(() => {
                toast("Something went wrong :(");
                setLoading(false);
            });
        } catch (e) {
            toast("INVALID CURRENT PASSWORD");
            setLoading(false);
        }

    }

    function save(key, filename) {
        FileSaver['saveAs'](new Blob([key], {type: "application/octet-stream"}), filename)
    }

    return <Dialog
        title={"Credentials"}
        isOpen={true}
        onClose={() => props.setCredentials(null)}
    >
        <div className={Classes.DIALOG_BODY}>
            <div style={{width: "80%", display: "flex", margin: "0 auto"}}>
                <Button
                    outlined={true}
                    fill={true}
                    onClick={() => save(getKey("armoredPublicKey"), "public.asc")}
                >
                    Export public key
                </Button>
                &nbsp;&nbsp;
                <Button
                    outlined={true}
                    fill={true}
                    onClick={async () => {
                        try {
                            if (!password || !password.length) return toast("INVALID CURRENT PASSWORD");
                            await checkPassword();
                            save(getKey('privateKey').armor(), "private.asc")
                        } catch (e) {
                            toast("INVALID CURRENT PASSWORD");
                        }
                    }}
                >
                    Export private key
                </Button>
            </div>
            <br/>
            <form>
                <FormGroup
                    label="Current Password"
                    labelFor="password"
                >
                    <InputGroup
                        id="password"
                        type={type}
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                    />
                </FormGroup>
                <FormGroup
                    label="New Password"
                    labelFor="newPassword"
                >
                    <InputGroup
                        id="newPassword"
                        type={type}
                        onChange={(e) => setNewPassword(e.target.value)}
                        value={newPassword}
                    />
                </FormGroup>
            </form>
            <div style={{width: "80%", display: "flex", margin: "0 auto"}}>
                <Button
                    outlined={true}
                    fill={true}
                    onClick={() => setType(type === "password" ? "text" : "password")}
                >
                    {type === "password" ? "Show" : "Hide"} passwords
                </Button>
                &nbsp;&nbsp;
                <Button
                    outlined={true}
                    fill={true}
                    loading={loading}
                    onClick={() => update()}
                >
                    Update password
                </Button>
            </div>
        </div>
    </Dialog>
}