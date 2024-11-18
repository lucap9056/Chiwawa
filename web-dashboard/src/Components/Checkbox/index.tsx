import React, { useState } from "react";

import "./style.css";

interface Props {
    name: string
    label: string
    value: boolean
    onChange: (value: boolean) => void
}

const Checkbox: React.FC<Props> = (props) => {

    const [checked, SetChecked] = useState(props.value);

    const Change = () => {
        const value = !checked;
        SetChecked(value);
        props.onChange(value);
    }

    return <div className="checkbox_container">
        <div className="checkbox_label">{props.label}</div>
        <div className="checkbox_content">
            <div className="checkbox" data-checked={checked} onClick={Change}></div>
        </div>
        <input type="checkbox" name={props.name} checked={checked} readOnly hidden />
    </div>
}

export default Checkbox;