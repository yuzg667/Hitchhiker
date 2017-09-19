import React from 'react';
import { connect, Dispatch } from 'react-redux';
import { Tabs, Button, Tag, Icon } from 'antd';
import Editor from '../../../components/editor';
import './style/index.less';
import { RunResult } from '../../../../../api/interfaces/dto_run_result';
import { StringUtil } from '../../../utils/string_util';
import { nameWithTag } from '../../../components/name_with_tag';
import { successColor, failColor, pass, fail, allParameter } from '../../../common/constants';
import { actionCreator } from '../../../action/index';
import { SelectResTabType, ToggleReqPanelVisibleType } from '../../../action/ui';
import ResponseLoadingPanel from './response_loading_panel';
import ResErrorPanel from '../../../components/res_error_panel';
import { State } from '../../../state/index';
import { getActiveRecordSelector, getActiveRecordStateSelector, getResHeightSelector, getResActiveTabKeySelector, getIsResPanelMaximumSelector } from './selector';
import { ResponseState } from '../../../state/collection';

const TabPane = Tabs.TabPane;

/*const contentExtra = (
    <div>
        <Icon type="copy" />
        <Icon type="search" />
    </div>
);*/

interface ResponsePanelStateProps {

    activeKey: string;

    url?: string;

    height?: number;

    res: RunResult | ResponseState;

    activeTab: string;

    isResPanelMaximum: boolean;

    isRequesting: boolean;
}

interface ResponsePanelDispatchProps {

    toggleResPanelMaximize(id: string, visible: boolean);

    selectResTab(id: string, key: string);
}

type ResponsePanelProps = ResponsePanelStateProps & ResponsePanelDispatchProps;

interface ResponsePanelState { }

const ResponseEmptyPanel = (
    <div>
        <div className="res-non-header">Response</div>
        <div className="res-non-content">Hit
            <span>
                <Icon type="rocket" />
                Send
            </span>
            to get a response.</div>
    </div>
);

class ResponsePanel extends React.Component<ResponsePanelProps, ResponsePanelState> {

    private tabPanelCookie = (cookies: string[]) => (
        cookies.map((cookie, index) => <div key={`res-cookie-${index}`}> {cookie} </div>)
    )

    private tabPanelHeaders = (headers: { [key: string]: string; }) => (
        <ul className="res-tabpanel-list">
            {
                headers ? Object.keys(headers).map(key => (
                    <li key={`res-header-${key}`}>
                        <span className="tabpanel-headers-key">{key}: </span>
                        <span>{headers[key]}</span>
                    </li>)
                ) : ''
            }
        </ul>
    )

    private tabPanelTest = (tests: { [key: string]: boolean }) => (
        <ul className="res-tabpanel-list">
            {
                tests ? Object.keys(tests).map(key => (
                    <li key={`res-test-${key}`}>
                        <Tag color={tests[key] ? successColor : failColor}>{tests[key] ? pass : fail}</Tag>
                        <span>{key}</span>
                    </li>)
                ) : ''
            }
        </ul>
    )

    private getExtraContent = () => {
        const { res, toggleResPanelMaximize, isResPanelMaximum, activeKey } = this.props;
        if (!this.isRunResult(res)) {
            return <div />;
        }
        let { elapsed, status, statusMessage } = res;
        return (
            <div>
                <span>Status:</span>
                <span className="res-status">{status} {statusMessage}</span>
                <span style={{ marginLeft: '16px' }}>Time:</span>
                <span className="res-status">{elapsed}ms</span>
                <span><Button className="res-toggle-size-btn" icon={isResPanelMaximum ? 'down' : 'up'} onClick={() => toggleResPanelMaximize(activeKey, !isResPanelMaximum)} /></span>
            </div>
        );
    }

    private get normalResponsePanel() {
        const { res, selectResTab, activeKey } = this.props;
        if (!this.isRunResult(res)) {
            return <div />;
        }
        let { body, cookies, headers, tests } = res;

        cookies = cookies || [];
        tests = tests || [];
        headers = headers || [];

        const value = StringUtil.beautify(body, headers['Content-Type']);
        const testKeys = Object.keys(tests);
        const successTestLen = Object.keys(tests).filter(t => tests[t]).length;
        const testsTag = testKeys.length > 0 ? `${successTestLen}/${Object.keys(tests).length}` : '';

        return (
            <Tabs
                className="req-res-tabs"
                defaultActiveKey="content"
                activeKey={this.props.activeTab}
                onChange={v => selectResTab(activeKey, v)}
                animated={false}
                tabBarExtraContent={this.getExtraContent()}>
                <TabPane tab="Content" key="content">
                    <Editor type="json" value={value} height={this.props.height} readOnly={true} />
                </TabPane>
                <TabPane className="display-tab-panel" tab={nameWithTag('Headers', Object.keys(headers).length.toString())} key="headers">
                    {
                        this.tabPanelHeaders(headers)
                    }
                </TabPane>
                <TabPane className="display-tab-panel" tab={nameWithTag('Cookies', cookies.length.toString())} key="cookies">
                    {
                        this.tabPanelCookie(cookies)
                    }
                </TabPane>
                <TabPane className="display-tab-panel" tab={nameWithTag('Test', testsTag, successTestLen === testKeys.length ? 'normal' : 'warning')} key="test">
                    {
                        this.tabPanelTest(tests)
                    }
                </TabPane>
            </Tabs>
        );
    }

    private isRunResult(res: RunResult | ResponseState): res is RunResult {
        return (res as RunResult).id !== undefined;
    }

    public render() {

        const { isRequesting, res, url } = this.props;

        if (isRequesting) {
            return <ResponseLoadingPanel />;
        }

        if (!res) {
            return ResponseEmptyPanel;
        }

        if (this.isRunResult(res)) {
            return res.error ? <ResErrorPanel url={url} error={res.error} /> : this.normalResponsePanel;
        }

        return ResponseEmptyPanel;
    }
}

const mapStateToProps = (state: State): ResponsePanelStateProps => {
    const record = getActiveRecordSelector()(state);
    const recordState = getActiveRecordStateSelector()(state);
    const activeKey = state.displayRecordsState.activeKey;
    const { currParam, paramArr } = StringUtil.parseParameters(record.parameters, record.parameterType, recordState.parameter);
    const currParamStr = JSON.stringify(currParam);
    const res = paramArr.length === 0 || currParam === allParameter ? state.displayRecordsState.responseState[activeKey] : state.displayRecordsState.responseState[activeKey][currParamStr];
    return {
        activeKey,
        url: record.url,
        isRequesting: recordState.isRequesting,
        res,
        height: getResHeightSelector()(state),
        activeTab: getResActiveTabKeySelector()(state),
        isResPanelMaximum: getIsResPanelMaximumSelector()(state)
    };
};

const mapDispatchToProps = (dispatch: Dispatch<any>): ResponsePanelDispatchProps => {
    return {
        selectResTab: (recordId, tab) => dispatch(actionCreator(SelectResTabType, { recordId, tab })),
        toggleResPanelMaximize: (recordId, visible) => dispatch(actionCreator(ToggleReqPanelVisibleType, { recordId, visible })),
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ResponsePanel);