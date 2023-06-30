import React from "react";
import { Span, Trace } from "../../../types/trace";

type Tprops = {
    trace: Trace
}

const findRootSpanId = (spans: Span[]):string | undefined => {
    const rootSpan = spans.find((span)=>span.references.length === 0 && span.depth === 0);
    return rootSpan?.spanID
}

const findChildSpanIds = (spans: Span[]): Span[] => {
    const refinedSpanData:Span[] = []
    spans.forEach((span)=>{
        if(span.hasChildren){
            const Children = spans.filter((span2)=>span2.references.some((reference)=>reference.refType === 'CHILD_OF' && reference.spanID === span.spanID)).map((span2)=>span2.spanID);
            refinedSpanData.push({...span,childSpanIds: Children})
        }
        else{
            refinedSpanData.push({...span,childSpanIds: []})
        }
    })
    return refinedSpanData;
}


function TraceCriticalPath(props: Tprops ){
    console.log(props.trace);
    const RootSpanId = findRootSpanId(props.trace.spans);
    if(RootSpanId){
        const refinedSpanData:Span[] = findChildSpanIds(props.trace.spans);
        console.log("Refined Span Data is");
        console.log(refinedSpanData);
    }
    return <div>Hi</div>
}

export default TraceCriticalPath