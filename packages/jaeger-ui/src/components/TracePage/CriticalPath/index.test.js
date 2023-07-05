import TraceCriticalPath from "./index"
import transformTraceData from "../../../model/transform-trace-data";
import { criticalPathSections } from "./testResults/test1";

const testTrace = require("../TraceStatistics/tableValuesTestTrace/testTraceNormal.json");
const transformedTrace = transformTraceData(testTrace);

const defaultProps = {
    trace: transformedTrace,
};

describe("<TraceCriticalPath />",() => {
    it("Critical path sections", () => {
        const consoleLogMock = jest.spyOn(console, 'log').mockImplementation()
        TraceCriticalPath(defaultProps);
        expect(consoleLogMock).toHaveBeenCalledWith(criticalPathSections)
    })
})