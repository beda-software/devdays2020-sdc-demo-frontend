import React from 'react';
import { QuestionnaireResponseForm } from 'src/components/QuestionnaireResponseForm';
import { Parameters, Patient, Questionnaire, QuestionnaireResponse } from 'shared/lib/contrib/aidbox';
import { useService } from 'aidbox-react/lib/hooks/service';
import { service } from 'aidbox-react/lib/services/service';
import { RenderRemoteData } from 'src/components/RenderRemoteData';
import { isSuccess } from 'aidbox-react/lib/libs/remoteData';

import s from './PatientFormBox.module.scss';

interface PatientFormBoxProps {
    questionnaire: Questionnaire;
    patient: Patient;
    setBatchRequest: React.Dispatch<any>;
    mappingId: string;
    setQuestionnaireResponse: React.Dispatch<QuestionnaireResponse>;
}

export function PatientFormBox(props: PatientFormBoxProps) {
    const { questionnaire, patient, setBatchRequest, mappingId, setQuestionnaireResponse } = props;
    const [questionnaireResponse] = useService(async () => {
        const params: Parameters = {
            resourceType: 'Parameters',
            parameter: [
                { name: 'LaunchPatient', resource: patient },
                { name: 'questionnaire', resource: questionnaire },
            ],
        };

        const populatedResp = await service<QuestionnaireResponse>({
            method: 'POST',
            url: '/Questionnaire/$populate',
            data: params,
        });
        return populatedResp;
    }, [questionnaire]);
    return (
        <RenderRemoteData remoteData={questionnaireResponse}>
            {(questionnaireResponse) => (
                <div className={s.wrapper}>
                    <QuestionnaireResponseForm
                        questionnaire={questionnaire}
                        resource={questionnaireResponse}
                        onSave={async (resource) => {
                            const debugResponse = await service({
                                method: 'POST',
                                url: `/Mapping/${mappingId}/$debug`,
                                data: resource,
                            });
                            if (isSuccess(debugResponse)) {
                                setBatchRequest(debugResponse.data);
                            }
                            setQuestionnaireResponse(resource);
                        }}
                    />
                </div>
            )}
        </RenderRemoteData>
    );
}
