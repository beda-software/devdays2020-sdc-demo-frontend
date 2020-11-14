import React from 'react';
import { Button } from 'src/components/Button';
import { Bundle, QuestionnaireResponse } from 'shared/lib/contrib/aidbox';
import { applyMapping } from 'src/utils/mapping';
import { CodeEditor } from 'src/components/CodeEditor';

import s from './PatientBatchRequestBox.module.scss';

interface PatientBatchRequestBoxProps {
    batchRequest?: Bundle<any>;
    mappingId: string;
    questionnaireResponse?: QuestionnaireResponse;
}

export function PatientBatchRequestBox(props: PatientBatchRequestBoxProps) {
    const { batchRequest, mappingId, questionnaireResponse } = props;

    return (
        <>
            <h2>Patient batch request</h2>
            <div className={s.wrapper}>
                <CodeEditor
                    valueObject={batchRequest}
                    options={{
                        readOnly: true,
                    }}
                />
                <Button
                    onClick={async () => {
                        if (questionnaireResponse) {
                            await applyMapping(mappingId, questionnaireResponse);
                            window.location.reload();
                        }
                    }}
                    disabled={!batchRequest}
                >
                    Apply
                </Button>
            </div>
        </>
    );
}