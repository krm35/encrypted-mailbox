import React, {useEffect} from "react";
import {Button, H1, HTMLTable, Navbar} from "@blueprintjs/core";
import Pagination from "./Pagination";
import MailViewer from "./MailViewer";
import {HTTPClient} from "./HTTPClient";
import Loader from "./Loader";
import MailComposer from "./MailComposer";
import Credentials from "./Credentials";
import {initWS, updateTheme} from "./utilities";

const {useState} = require("react");

export default function Panel() {

    // const [emails] = useEmails();
    const [mail, setMail] = useState(null);
    const [page, setPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [lastPage, setLastPage] = useState(1);
    const [tabId, setTabId] = useState("Mailbox");
    const [filter/*, setFilter*/] = useState({});
    const [documents, setDocuments] = useState(null);
    const [compose, setCompose] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [theme, setTheme] = useState(localStorage['smtp-theme']);

    const newDoc = (json) => {
        if (json[1].deleted) {
            setDocuments(window.documents.filter(d => d._id !== json[1]._id));
        } else {
            if (json[0] === tabId && page === 1) {
                setDocuments([json[1]].concat(window.documents));
            }
        }
    };

    useEffect(() => initWS(newDoc), []);

    useEffect(() => {
        setDocuments(null);
        HTTPClient.post("/" + tabId.toLowerCase(), {page, items: itemsPerPage, filter})
            .then(res => {
                const {error, data} = res.data;
                if (error) {
                    return;
                }
                // console.log(data['documents']);
                window.documents = data['documents'];
                setDocuments(data['documents']);
                setLastPage(Math.ceil(data['count'] / itemsPerPage));
            })
            .catch(() => console.log("error"))
    }, [tabId, page, itemsPerPage, filter]);

    return (
        <div>
            <Navbar>
                <Navbar.Group>
                    <Navbar.Heading>PGP-SMTP</Navbar.Heading>
                    <Navbar.Divider/>
                    <Button
                        icon="send-message"
                        text="Compose"
                        onClick={() => setCompose(true)}
                    />
                    <Navbar.Divider/>
                    <Button
                        minimal={tabId === "Mailbox"}
                        icon="inbox"
                        text="Mailbox"
                        onClick={() => setTabId("Mailbox")}
                    />
                    <Button
                        minimal={tabId === "Sent"}
                        icon="envelope"
                        text="Sent"
                        onClick={() => setTabId("Sent")}
                    />
                    {/*<Button*/}
                    {/*    minimal={tabId === "Drafts"}*/}
                    {/*    icon="unarchive"*/}
                    {/*    text="Drafts"*/}
                    {/*    onClick={() => setTabId("Drafts")}*/}
                    {/*/>*/}
                    {/*<Button*/}
                    {/*    minimal={tabId === "Archive"}*/}
                    {/*    icon="projects"*/}
                    {/*    text="Archive"*/}
                    {/*    onClick={() => setTabId("Archive")}*/}
                    {/*/>*/}
                    <Navbar.Divider/>
                    <Button
                        icon="key"
                        text="Crendentials"
                        onClick={() => setCredentials(true)}
                    />
                    <Navbar.Divider/>
                    <Button
                        icon={theme}
                        onClick={() => {
                            const newTheme = theme === "moon" ? "flash" : "moon";
                            setTheme(newTheme);
                            localStorage['smtp-theme'] = newTheme;
                            updateTheme();
                        }}
                    />
                </Navbar.Group>
            </Navbar>

            <br/>

            <H1>&nbsp;{tabId}</H1>

            {documents === null ? <Loader/> :
                <HTMLTable bordered interactive style={{marginTop: "5px", marginBottom: "5px", width: '100%'}}>
                    <thead>
                    <tr>
                        <th>{tabId === "Mailbox" ? "From" : "To"}</th>
                        <th>Subject</th>
                        <th>@</th>
                    </tr>
                    </thead>
                    <tbody>
                    {documents.map(doc =>
                        <tr key={doc._id}
                            onClick={() => {
                                if (tabId === "Drafts") setCompose(true);
                                setMail(doc);
                            }}>
                            <td>{doc[tabId === "Mailbox" ? "from" : "to"].text}</td>
                            <td>{doc.subject}</td>
                            <td>{new Date(doc.t).toLocaleString('fr')}</td>
                        </tr>
                    )}
                    </tbody>
                </HTMLTable>}

            <Pagination
                itemsPerPage={itemsPerPage}
                page={page}
                setPage={setPage}
                setLastPage={setLastPage}
                lastPage={lastPage}
            />

            {mail && !compose && <MailViewer mail={mail} setMail={setMail} tabId={tabId}/>}
            {compose && <MailComposer mail={mail} setMail={setMail} setCompose={setCompose}/>}
            {credentials && <Credentials setCredentials={setCredentials}/>}
        </div>
    )
};