import React from "react";
import {Button, Classes} from "@blueprintjs/core";
import {IconNames} from "@blueprintjs/icons";

const Pagination = function (props) {

    return (
        <div style={{textAlign: "center"}}>
            <Button minimal
                    icon={IconNames.DOUBLE_CHEVRON_LEFT}
                    onClick={() => props.setPage(1)}
                    disabled={props.page === 1}
            />
            <Button minimal
                    icon={IconNames.CHEVRON_LEFT}
                    onClick={() => props.setPage(props.page - 1)}
                    disabled={props.page === 1}
            />
            <input
                className={'pagination-input ' + Classes.INPUT}
                placeholder={props.page}
                onChange={(event) => {
                    let page = parseInt(event.currentTarget.value);
                    if (isNaN(page) || page <= 0) page = 1;
                    else if (page > props.lastPage) page = props.lastPage;
                    props.setPage(page)
                }}
                value={props.page}
            />
            <Button minimal
                    icon={IconNames.CHEVRON_RIGHT}
                    onClick={() => props.setPage(props.page + 1)}
                    disabled={props.page >= props.lastPage}
            />
            <Button minimal
                    rightIcon={IconNames.DOUBLE_CHEVRON_RIGHT}
                    onClick={() => props.setPage(props.lastPage)}
                    disabled={props.page >= props.lastPage}
            />
        </div>
    )
};

export default Pagination;

