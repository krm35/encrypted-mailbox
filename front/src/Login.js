import React, {useEffect, useState} from "react";
import {Button, Dialog, FormGroup, InputGroup} from "@blueprintjs/core";
import * as Classes from "@blueprintjs/core/lib/cjs/common/classes";
import {HTTPClient} from "./HTTPClient";
import {setKey, toast} from "./utilities";
import {randomBytes} from "crypto";

const {
    createCleartextMessage,
    createMessage,
    decrypt,
    decryptKey,
    encrypt,
    generateKey,
    readKey,
    readMessage,
    readPrivateKey,
    sign
} = window.openpgp;

export default function Login(props) {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loader, setLoader] = useState(null);

    useEffect(() => {
        setTimeout(function () {
            try {
                if (!document.getElementById("password").value.length) return;
                document.getElementById("sign-in")?.click();
            } catch (e) {
            }
        }, 1000);
    }, []);

    async function signUp() {
        setLoader("signup");
        const passphrase = randomBytes(64).toString('hex');
        const {privateKey, publicKey} = await generateKey({
            type: 'rsa',
            rsaBits: 2048,
            userIDs: [{email}],
            passphrase
        });
        const encryptedPassphrase = await encrypt({
            message: await createMessage({text: passphrase}),
            passwords: [password]
        });
        HTTPClient.post('/signup', {email, publicKey, privateKey, encryptedPassphrase})
            .then(async (result) => {
                const {error, data} = result.data;
                if (error) {
                    setLoader(null);
                    return toast(data);
                }
                await setKeys(email, passphrase, publicKey, privateKey);
                props.setConnected(true);
            }).catch(() => {
            toast("Something went wrong :(");
            setLoader(null);
        });
    }

    async function setKeys(email, passphrase, publicKey, privateKey, encryptedPassphrase) {
        setKey("email", email);
        setKey("passphrase", passphrase);
        setKey("armoredPublicKey", publicKey);
        setKey("armoredPrivateKey", privateKey);
        setKey("publicKey", await readKey({armoredKey: publicKey}));
        setKey("privateKey", await decryptKey({
            privateKey: await readPrivateKey({armoredKey: privateKey}),
            passphrase
        }));
        setKey("encryptedPassphrase", encryptedPassphrase);
    }

    function signMessage(token, text) {
        HTTPClient.post('/sign', {token, text})
            .then(async (result) => {
                const {error, data} = result.data;
                if (error) return toast(data);
                props.setConnected(true);
            }).catch(() => {
            toast("Something went wrong :(");
            setLoader(null);
        });
    }

    function signIn() {
        setLoader("signin");
        HTTPClient.post('/signin', {email})
            .then(async (result) => {
                const {error, data} = result.data;
                if (error) {
                    setLoader(null);
                    return toast(data);
                }
                try {
                    const {data: passphrase} = await decrypt({
                        message: await readMessage({armoredMessage: data['encryptedPassphrase']}),
                        passwords: [password]
                    });
                    // noinspection JSCheckFunctionSignatures
                    const privateKey = await decryptKey({
                        privateKey: await readPrivateKey({armoredKey: data['privateKey']}),
                        passphrase
                    });
                    const message = await createCleartextMessage({text: data['token']});
                    // noinspection JSCheckFunctionSignatures
                    const cleartextMessage = await sign({message, signingKeys: privateKey});
                    await setKeys(email, passphrase, data['publicKey'], data['privateKey'], data['encryptedPassphrase']);
                    signMessage(data['token'], cleartextMessage);
                } catch (e) {
                    setLoader(null);
                    toast("INVALID PASSWORD");
                }
            })
            .catch(() => {
                setLoader(null);
                toast("Something went wrong :(");
            })
    }

    return <div>
        <Dialog isOpen={true}>
            <div className={Classes.DIALOG_BODY}>
                <form>
                    <FormGroup
                        label="Email address"
                        labelFor="email"
                    >
                        <InputGroup
                            id="email"
                            type={"email"}
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                        />
                    </FormGroup>
                    <FormGroup
                        label="Password"
                        labelFor="password"
                    >
                        <InputGroup
                            id="password"
                            type={"password"}
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                        />
                    </FormGroup>
                </form>
                <div style={{width: "80%", display: "flex", margin: "0 auto"}}>
                    <Button
                        loading={loader === 'signin'}
                        disabled={loader !== null}
                        id={"sign-in"}
                        outlined={true}
                        fill={true}
                        onClick={() => signIn()}
                    >
                        Sign in
                    </Button>
                    &nbsp;&nbsp;
                    <Button
                        loading={loader === 'signup'}
                        disabled={loader !== null}
                        outlined={true}
                        fill={true}
                        onClick={() => signUp().catch(() => {
                            toast("INVALID EMAIL");
                        })}
                    >
                        Sign up
                    </Button>
                </div>
            </div>
        </Dialog>
    </div>

}