searchInTable = (
  uiFindVertexKeys: Set<string>,
  allTableSpans: ITableSpan[],
  uiFind: string | null | undefined
) => {
  const allTableSpansChange = allTableSpans;
  const yellowSearchColor = 'rgb(255,243,215)';
  const defaultGrayColor = 'rgb(248,248,248)';

  for (let i = 0; i < allTableSpansChange.length; i++) {
    if (!allTableSpansChange[i].isDetail && allTableSpansChange[i].hasSubgroupValue) {
      allTableSpansChange[i].searchColor = 'transparent';
    } else if (allTableSpansChange[i].hasSubgroupValue) {
      allTableSpansChange[i].searchColor = defaultGrayColor;
    } else {
      allTableSpansChange[i].searchColor = defaultGrayColor;
    }
  }

  if (typeof uiFindVertexKeys !== 'undefined') {
    uiFindVertexKeys!.forEach(function calc(value) {
      const uiFindVertexKeysSplit = value.split('\u000b');

      for (let i = 0; i < allTableSpansChange.length; i++) {
        if (
          uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(
            allTableSpansChange[i].name
          ) !== -1
        ) {
          if (allTableSpansChange[i].parentElement === 'none') {
            allTableSpansChange[i].searchColor = yellowSearchColor;
          } else if (
            uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(
              allTableSpansChange[i].parentElement
            ) !== -1
          ) {
            allTableSpansChange[i].searchColor = yellowSearchColor;
          }
        }
      }
    });
  }

  if (uiFind) {
    for (let i = 0; i < allTableSpansChange.length; i++) {
      if (allTableSpansChange[i].name.indexOf(uiFind!) !== -1) {
        allTableSpansChange[i].searchColor = yellowSearchColor;

        for (let j = 0; j < allTableSpansChange.length; j++) {
          if (allTableSpansChange[j].parentElement === allTableSpansChange[i].name) {
            allTableSpansChange[j].searchColor = yellowSearchColor;
          }
        }

        if (allTableSpansChange[i].isDetail) {
          for (let j = 0; j < allTableSpansChange.length; j++) {
            if (allTableSpansChange[i].parentElement === allTableSpansChange[j].name) {
              allTableSpansChange[j].searchColor = yellowSearchColor;
            }
          }
        }
      }
    }
  }

  return allTableSpansChange;
};
