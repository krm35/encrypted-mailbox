import React, {useEffect, useState} from "react";
import {Button, Checkbox, H3, HTMLSelect, HTMLTable, Icon, InputGroup, Navbar} from "@blueprintjs/core";
import Pagination from "./Pagination";
import MailViewer from "./MailViewer";
import {HTTPClient} from "./HTTPClient";
import Loader from "./Loader";
import MailComposer from "./MailComposer";
import Credentials from "./Credentials";
import {initWS, toast, updateTheme} from "./utilities";
import {DateRangeInput} from "@blueprintjs/datetime";

const options = [
    {label: "10 mails", value: 10},
    {label: "25 mails", value: 25},
    {label: "50 mails", value: 50},
    {label: "100 mails", value: 100}
];

export default function Panel(props) {

    const [mail, setMail] = useState(null);
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(localStorage['itemsPerPage'] || 25);
    const [lastPage, setLastPage] = useState(1);
    const [tabId, setTabId] = useState("Mailbox");
    const [filter, setFilter] = useState({});
    const [documents, setDocuments] = useState(null);
    const [start, setStart] = useState(null);
    const [end, setEnd] = useState(null);
    const [compose, setCompose] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [theme, setTheme] = useState(localStorage['smtp-theme']);
    filter.open = localStorage['filter.open'] ? false : undefined;

    window.newDoc = (json) => {
        if (json[1].deleted) {
            window.documents = window.documents.filter(d => d._id !== json[1]._id);
            setDocuments(window.documents);
        } else {
            if (json[0] === tabId && page === 1) {
                setDocuments([json[1]].concat(window.documents));
            }
        }
    };

    useEffect(() => initWS(), []);

    useEffect(() => {
        setDocuments(null);
        HTTPClient.post("/" + tabId.toLowerCase(), {page, items: itemsPerPage, filter, start, end})
            .then(res => {
                const {error, data} = res.data;
                if (error) {
                    return;
                }
                window.documents = data['documents'];
                setDocuments(data['documents']);
                setLastPage(Math.ceil(data['count'] / itemsPerPage));
            })
            .catch(() => console.log("error"))
    }, [tabId, page, itemsPerPage, filter, start, end]);

    return (
        <div>
            <Navbar>
                <Navbar.Group>
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
                    <Button
                        minimal={tabId === "Drafts"}
                        icon="unarchive"
                        text="Drafts"
                        onClick={() => setTabId("Drafts")}
                    />
                    <Button
                        minimal={tabId === "Trash"}
                        icon="trash"
                        text="Trash"
                        onClick={() => setTabId("Trash")}
                    />
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
                        icon="log-out"
                        text="Log out"
                        onClick={() => props.setConnected(null)}
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

            <H3>&nbsp;{tabId}</H3>

            <div style={{margin: "5px", display: "flex"}}>
                <InputGroup
                    onChange={({target}) => {
                        setPage(1);
                        setFilter({...filter, search: target.value});
                    }}
                    rightElement={filter?.search?.length && <Button
                        icon={"cross"}
                        minimal={true}
                        onClick={() => {
                            setPage(1);
                            setFilter({...filter, search: null});
                        }}
                    />}
                    value={filter?.search ?? ""}
                    placeholder={"Search"}
                />
                &nbsp;
                <DateRangeInput
                    allowSingleDayRange={true}
                    formatDate={date => date.toLocaleDateString()}
                    onChange={(range) => {
                        console.log(range);
                        setStart(range[0]);
                        setEnd(range[1]);
                    }}
                    parseDate={str => new Date(str)}
                    value={[start, end]}
                />
                &nbsp;
                <div>
                    <HTMLSelect
                        options={options}
                        fill={true}
                        onChange={(event) => {
                            const {value} = event.currentTarget;
                            setItemsPerPage(value);
                            localStorage['itemsPerPage'] = value;
                        }}
                        value={itemsPerPage}
                    />
                </div>
            </div>
            {tabId === "Mailbox" &&
            <Checkbox
                style={{marginLeft: "10px", width: "150px"}}
                checked={filter.open !== undefined}
                label="Only unread"
                onChange={() => {
                    const open = filter.open !== undefined ? undefined : false;
                    if (open !== undefined) localStorage['filter.open'] = open;
                    else delete localStorage['filter.open'];
                    setFilter({...filter, open: open})
                }
                }
            />}
            {documents === null ? <Loader/> :
                <HTMLTable bordered interactive style={{marginTop: "5px", marginBottom: "5px", width: '100%'}}>
                    <thead>
                    <tr>
                        {tabId === "Trash" && <th width="25%">From</th>}
                        <th width="25%">{tabId === "Mailbox" ? "From" : "To"}</th>
                        <th>Subject</th>
                        <th>@</th>
                        {tabId !== "Trash" && <th/>}
                    </tr>
                    </thead>
                    <tbody>
                    {documents.map(doc => {
                            const type = tabId === "Mailbox" ? "from" : "to";
                            const text = doc[type]?.text ?? "";
                            const id = doc._id;
                            const onClick = () => {
                                if (tabId === "Drafts") {
                                    doc.draft = true;
                                    setCompose(true);
                                }
                                doc.open = true;
                                setMail(doc);
                            };
                            return (
                                <tr key={id}>
                                    {tabId === "Trash" && <td>{doc["from"]?.text ?? ""}</td>}
                                    <td onClick={onClick}>
                                        <Icon
                                            id={"unread" + id}
                                            style={{display: doc.open === false ? "" : "none"}}
                                            icon={"envelope"}/> &nbsp;{text}</td>
                                    <td onClick={onClick}>{doc.subject}</td>
                                    <td onClick={onClick}>{new Date(doc.t).toLocaleString('fr')}</td>
                                    {tabId !== "Trash" && <td>
                                        <>
                                            <Button onClick={() =>
                                                HTTPClient.post("/" + tabId.toLowerCase() + "-trash", {id})
                                                    .catch(() => toast("Something went wrong :("))
                                            } outlined={true} icon={"trash"}/>
                                            &nbsp;
                                            {doc.open !== false && <Button id={"mark-unread" + id} onClick={() =>
                                                HTTPClient.post("/mark-unread", {id})
                                                    .then(() => {
                                                        document.getElementById("unread" + id).style.display = "";
                                                        document.getElementById("mark-unread" + id).style.display = "none";
                                                    })
                                                    .catch(() => toast("Something went wrong :("))
                                            } outlined={true} icon={"envelope"}
                                            />}
                                        </>
                                    </td>}
                                </tr>)
                        }
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

            {mail && !compose && <MailViewer mail={mail} setMail={setMail} tabId={tabId} setCompose={setCompose}/>}
            {compose && <MailComposer mail={mail} setMail={setMail} setCompose={setCompose}/>}
            {credentials && <Credentials setCredentials={setCredentials}/>}
        </div>
    )
};