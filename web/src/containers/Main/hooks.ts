import { useService } from 'aidbox-react/src/hooks/service';
import { getAllFHIRResources, getFHIRResource, saveFHIRResource } from 'aidbox-react/src/services/fhir';
import { Bundle, Mapping, Parameters, Patient, Questionnaire, QuestionnaireResponse } from 'shared/src/contrib/aidbox';
import { service, sequenceMap } from 'aidbox-react/src/services/service';
import { isSuccess, notAsked, RemoteData, loading, success } from 'aidbox-react/src/libs/remoteData';
import React, { useCallback, useEffect, useState } from 'react';
import _ from 'lodash';

const defaultPatientId = 'patient-1';

export enum ResourceFormat {
    aidbox = 'Aidbox',
    fhir = 'FHIR',
}

export function useMain(questionnaireId: string) {
    const [resourceFormat, setResourceFormat] = useState<ResourceFormat>(ResourceFormat.fhir);
    const formatPrefix = resourceFormat === ResourceFormat.fhir ? '/fhir' : '';

    // Patient
    const [patientId, setPatientId] = useState<string>(defaultPatientId);

    const [patientRD] = useService(
        () =>
            service({
                method: 'GET',
                url: `${formatPrefix}/Patient/${patientId}`,
            }),
        [patientId, formatPrefix],
    );

    const [patientsRD] = useService(
        () => getAllFHIRResources<Patient>('Patient', { _elements: 'id,name.given,name.family' }),
        [],
    );

    // Questionnaire
    const [questionnaireRD, questionnaireManager] = useService(async () => {
        const response = await service<Questionnaire>({
            method: 'GET',
            url: `Questionnaire/${questionnaireId}/$assemble`,
        });

        if (isSuccess(response)) {
            const mappings = response.data.mapping || [];
            const sortedMappings = _.sortBy(mappings, 'id');
            setMappingList(sortedMappings);
            const firstMapping = sortedMappings.length ? sortedMappings[0] : undefined;
            setActiveMappingId(firstMapping?.id);
        }

        return response;
    }, [questionnaireId]);

    // Questionnaire in specified format
    const [questionnaireResourceRD] = useService(
        () =>
            service<Questionnaire>({
                method: 'GET',
                url: `${formatPrefix}/Questionnaire/${questionnaireId}`,
            }),
        [questionnaireId, formatPrefix],
    );

    const saveQuestionnaireFHIR = useCallback(
        async (resource: Questionnaire) => {
            const response = await service({
                method: 'PUT',
                data: resource,
                url: `${formatPrefix}/Questionnaire/${resource.id}`,
            });
            if (isSuccess(response)) {
                questionnaireManager.reload();
            } else {
                console.error('Could not save Questionnaire:', response.error.toString());
            }
        },
        [questionnaireManager, formatPrefix],
    );

    // QuestionnaireResponse
    const [questionnaireResponseRD, setQuestionnaireResponseRD] = useState<RemoteData<QuestionnaireResponse>>(loading);

    const loadQuestionnaireResponse = useCallback(async () => {
        if (isSuccess(patientRD) && isSuccess(questionnaireRD)) {
            const params: Parameters = {
                resourceType: 'Parameters',
                parameter: [
                    { name: 'LaunchPatient', resource: patientRD.data },
                    { name: 'questionnaire', resource: questionnaireRD.data },
                ],
            };
            const response = await service<QuestionnaireResponse>({
                method: 'POST',
                url: '/Questionnaire/$populate',
                data: params,
            });
            if (isSuccess(response)) {
                setQuestionnaireResponseRD(response);
                // console.log('<-1-2*', JSON.stringify(response.data));
            }
        }
    }, [patientRD, questionnaireRD]);

    const saveQuestionnaireResponse = useCallback(
        (resource: QuestionnaireResponse) => {
            if (isSuccess(questionnaireResponseRD)) {
                if (!_.isEqual(resource, questionnaireResponseRD.data)) {
                    setQuestionnaireResponseRD(success(resource));
                }
            }
        },
        [questionnaireResponseRD],
    );

    useEffect(() => {
        (async () => {
            const loadingStatus = sequenceMap({ patientRD, questionnaireRD });
            if (isSuccess(loadingStatus)) {
                await loadQuestionnaireResponse();
            } else {
                setQuestionnaireResponseRD(loadingStatus);
            }
        })();
    }, [patientRD, questionnaireRD, loadQuestionnaireResponse]);

    // MappingList
    const [mappingList, setMappingList] = useState<Mapping[]>([]);

    // Active mapping id
    const [activeMappingId, setActiveMappingId] = useState<string | undefined>();

    // Mapping
    const [mappingRD, setMappingRD] = useState<RemoteData<Mapping>>(notAsked);

    const loadMapping = useCallback(async () => {
        const response = await getFHIRResource<Mapping>({
            resourceType: 'Mapping',
            id: activeMappingId!,
        });
        setMappingRD(response);
    }, [activeMappingId]);

    useEffect(() => {
        (async () => {
            if (activeMappingId) {
                await loadMapping();
            }
        })();
    }, [activeMappingId, loadMapping]);

    const saveMapping = useCallback(
        async (mapping: Mapping) => {
            if (isSuccess(mappingRD)) {
                if (!_.isEqual(mapping, mappingRD.data)) {
                    const response = await saveFHIRResource(mapping);
                    if (isSuccess(response)) {
                        await loadMapping();
                    }
                }
            }
        },
        [loadMapping, mappingRD],
    );

    // BatchRequest
    const [batchRequestRD, setBatchRequestRD] = React.useState<RemoteData<Bundle<any>>>(notAsked);

    useEffect(() => {
        (async function () {
            if (activeMappingId && isSuccess(questionnaireResponseRD)) {
                const response = await service({
                    method: 'POST',
                    url: `/Mapping/${activeMappingId}/$debug`,
                    data: questionnaireResponseRD.data,
                });
                setBatchRequestRD(response);
            }
        })();
    }, [questionnaireResponseRD, activeMappingId]);

    // Mapping apply
    const applyMappings = useCallback(async () => {
        const resourcesRD = sequenceMap({
            questionnaireRD,
            questionnaireResponseRD,
        });
        if (isSuccess(resourcesRD)) {
            const response = await service({
                method: 'POST',
                url: '/Questionnaire/$extract',
                data: {
                    resourceType: 'Parameters',
                    parameter: [
                        { name: 'questionnaire_response', resource: resourcesRD.data.questionnaireResponseRD },
                        { name: 'questionnaire', resource: resourcesRD.data.questionnaireRD },
                    ],
                },
            });
            if (isSuccess(response)) {
                window.location.reload();
            }
        }
    }, [questionnaireRD, questionnaireResponseRD]);

    return {
        resourceFormat,
        setResourceFormat,
        setPatientId,
        patientId,
        patientRD,
        patientsRD,
        questionnaireRD,
        questionnaireResourceRD,
        saveQuestionnaireFHIR,
        questionnaireResponseRD,
        saveQuestionnaireResponse,
        mappingList,
        activeMappingId,
        setActiveMappingId,
        mappingRD,
        saveMapping,
        batchRequestRD,
        applyMappings,
    };
}
