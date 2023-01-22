import React, {useState} from "react";
import {Button, Dialog, FormGroup, InputGroup} from "@blueprintjs/core";
import * as Classes from "@blueprintjs/core/lib/cjs/common/classes";
import {HTTPClient} from "./HTTPClient";
import {setKey, toast} from "./utilities";
import {randomBytes} from "crypto";
import {
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
} from "openpgp";

export default function Login(props) {

    // const [email, setEmail] = useState("admin@localhost.com");
    // const [password, setPassword] = useState("super long and hard to guess secret");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // if ("localhost" === window.location.hostname) {
    //     setTimeout(function () {
    //         const signInButton = document.getElementById("sign-in");
    //         if (signInButton) signInButton.click();
    //     }, 10);
    // }

    async function signUp() {
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
                if (error) return toast(data);
                await setKeys(email, passphrase, publicKey, privateKey);
                props.setConnected(true);
            }).catch(() => {
            toast("Something went wrong :(");
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
        });
    }

    function signIn() {
        HTTPClient.post('/signin', {email})
            .then(async (result) => {
                const {error, data} = result.data;
                if (error) return toast(data);
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
                    toast("INVALID PASSWORD");
                }
            }).catch(() => {
            toast("Something went wrong :(");
        });
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
                        label="Credentials"
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
                        id={"sign-in"}
                        outlined={true}
                        fill={true}
                        onClick={() => signIn()}
                    >
                        Sign in
                    </Button>
                    &nbsp;&nbsp;
                    <Button
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