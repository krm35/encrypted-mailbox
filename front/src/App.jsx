import React, {useState} from "react";
import {ErrorBoundary} from 'react-error-boundary'
import './App.css';
import Panel from "./Panel";
import Login from "./Login";
import {updateTheme} from "./utilities";

function ErrorHandler({error}) {
    return (
        <div role="alert">
            <p>An error occurred:</p>
            <pre>{error.message}</pre>
            <pre>{error.toString()}</pre>
        </div>
    )
}

export default function App() {
    const [connected, setConnected] = useState(false);

    if (!window.triggers) window.triggers = {};

    if (!localStorage['smtp-theme']) localStorage['smtp-theme'] = "moon";
    updateTheme();

    return <ErrorBoundary FallbackComponent={ErrorHandler}>
        {!connected && <Login autologin={connected === false} setConnected={setConnected}/>}
        {connected && <Panel setConnected={setConnected}/>}
    </ErrorBoundary>;
}