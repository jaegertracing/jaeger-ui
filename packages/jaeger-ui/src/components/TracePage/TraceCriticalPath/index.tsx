import React from "react";
import { Trace } from "../../../types/trace";

type Tprops = {
    trace: Trace
}

function TraceCriticalPath(props: Tprops ){
    console.log(props.trace);
    return <></>
}

export default TraceCriticalPath