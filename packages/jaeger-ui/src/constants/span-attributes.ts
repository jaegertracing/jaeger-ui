// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const GEN_AI_NAMESPACE = 'gen_ai.';

export const GEN_AI_OPERATION_NAME = 'gen_ai.operation.name';

export const GEN_AI_REQUEST_MODEL = 'gen_ai.request.model';

export const GEN_AI_TOOL_NAME = 'gen_ai.tool.name';

// A tool call's cross-span reference. Present on spans that merely *mention* a
// tool call, so on its own it does not make a span a GenAI span.
export const GEN_AI_TOOL_CALL_ID = 'gen_ai.tool.call.id';

// Braintrust's generic span input and output. Instrumentation that exports to
// Braintrust writes a span's I/O to the _json pair as a JSON string, or to the
// other pair as the value itself, so a span can carry these without any
// gen_ai.* attribute and still be a GenAI span.
export const BRAINTRUST_INPUT_JSON = 'braintrust.input_json';
export const BRAINTRUST_OUTPUT_JSON = 'braintrust.output_json';
export const BRAINTRUST_INPUT = 'braintrust.input';
export const BRAINTRUST_OUTPUT = 'braintrust.output';

// The unprefixed input and output of span models in which every GenAI span has an
// input and an output. Any span may carry these names, so on their own they do not
// make a span a GenAI span.
export const SPAN_INPUT = 'input';
export const SPAN_OUTPUT = 'output';
