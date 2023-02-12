import BpmnPropertiesProvider from 'bpmn-js-properties-panel/lib/provider/bpmn/BpmnPropertiesProvider.js';
import inherits from 'inherits';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import cmdHelper from 'bpmn-js-properties-panel/lib/helper/CmdHelper';
import entryFactory from 'bpmn-js-properties-panel/lib/factory/EntryFactory';
import eventDefinitionHelper from 'bpmn-js-properties-panel/lib/helper/EventDefinitionHelper';
import conditionalProps from 'bpmn-js-properties-panel/lib/provider/camunda/parts/ConditionalProps.js';
import messageDefinition from './MessageDefinition';

export default function ChorPropertiesProvider(injector, bpmnFactory) {

  injector.invoke(BpmnPropertiesProvider, this);

  const superGetTabs = this.getTabs;

  this.getTabs = function(element) {
    let generalTab = superGetTabs.call(this, element);
    const detailsGroup = generalTab[0].groups.filter(g => g.id === 'details')[0];
    if (is(element, 'bpmn:Event')) {
      // Conditional Events show Camunda specific options, we have to filter those
      if (element.businessObject.eventDefinitions) {
        const definition = element.businessObject.eventDefinitions[0];
        if (definition.$type === 'bpmn:ConditionalEventDefinition') {
          detailsGroup.entries = [];
          this.conditionalEvent(detailsGroup, element);
        }
      }
    }
    conditionalProps(detailsGroup, element, bpmnFactory, e => e);
    if (is(element, 'bpmn:Message')) {
      messageDefinition(detailsGroup, element, bpmnFactory, element.businessObject);
    }
    return generalTab;
  };

  ChorPropertiesProvider.prototype.conditionalEvent = function(group, element) {
    const getValue = function(conditionalEvent, node) {

      const conditionalEventDefinition = eventDefinitionHelper.getConditionalEventDefinition(conditionalEvent);
      return {
        condition: conditionalEventDefinition.condition.body
      };
    };

    const setValue = function(conditionalEvent, values) {

      const conditionalEventDefinition = eventDefinitionHelper.getConditionalEventDefinition(conditionalEvent);
      const condition = conditionalEventDefinition.condition;

      return cmdHelper.updateBusinessObject(conditionalEvent, condition, { body: values.condition });
    };

    group.entries.push(entryFactory.textField({
      id: 'condition',
      label: 'Condition Expression',
      modelProperty: 'condition',

      get: getValue,
      set: setValue
    }));
  };

}

inherits(ChorPropertiesProvider, BpmnPropertiesProvider);
ChorPropertiesProvider.$inject = [
  'injector',
  'bpmnFactory'
];

