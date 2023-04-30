import React from "react";
import {Alert} from "@blueprintjs/core";
import {Intent} from "@blueprintjs/core/lib/cjs/common/intent";

export default function DraftAlert(props) {
    return <Alert
        cancelButtonText="Discard"
        confirmButtonText="Save as draft"
        icon="floppy-disk"
        canOutsideClickCancel={true}
        canEscapeKeyCancel={true}
        intent={Intent.PRIMARY}
        isOpen={props.alert}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
    >
        <p>
            Do you want to save this email in your drafts box?
        </p>
    </Alert>
}