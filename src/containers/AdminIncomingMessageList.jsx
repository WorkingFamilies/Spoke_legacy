import React, { Component } from 'react'
import moment from 'moment'
import { uniqBy, get, maxBy } from 'lodash'
// import { CampaignList } from '../components/campaign_list'

import { Table, AutoSizer, Column } from 'react-virtualized'
import FlatButton from 'material-ui/FlatButton'

import axios from 'axios'


export default class AdminIncomingMessageList extends Component {
  constructor(props) {
    super(props)

    this.state = {
      isFetching: false,
      incomingMessages: [],
      limit: 200,
      offset: 0
    }
  }

  componentDidMount() {
    this.fetchMessages()
  }

  fetchMessages = (getNew) => {
    const { limit, offset, maxTimestamp } = this.state
    this.setState({ isFetching: true })
    let uri = `/allmessages/${this.props.params.organizationId}?limit=${limit}`
    if (getNew) uri += `&minTimestamp=${maxTimestamp}`
    else uri += `&offset=${offset}`

    console.log(uri)

    axios.get(uri).then(({ data }) => this.setState((thisState) => {
      let incomingMessages = []
      const messages = data.map(msg => ({
        ...msg,
        sentAt: moment(msg.created_at).format('MM/DD h:mm A'),
        text: `${msg.text.substr(0, 400)}${msg.text.length > 400 ? '...' : ''}`,
        userName: `${msg.user_first_name} ${msg.user_last_name}`,
        contactName: `${msg.contact_first_name} ${msg.contact_last_name}`
      }))
      if (getNew) {
        incomingMessages = uniqBy([...messages, ...thisState.incomingMessages], 'id')
      } else {
        incomingMessages = uniqBy([...thisState.incomingMessages, ...messages], 'id')
      }

      return {
        incomingMessages,
        maxTimestamp: get(maxBy(messages, 'created_at'), 'created_at'),
        isFetching: false,
        offset: !getNew ? thisState.offset + 200 : thisState.offset
      }
    }))
  }

  fetchOldMessages = () => this.fetchMessages()

  fetchNewMessages = () => this.fetchMessages('getNew')

  render() {
    const { incomingMessages, isFetching } = this.state
    return (
      <div style={{ height: '95%' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h3> All Incoming Messages </h3>
          <FlatButton
            onTouchTap={this.fetchNewMessages}
            label={isFetching ? 'Loading...' : 'Load New Messages'}
            disabled={isFetching}
            primary
          />
          <FlatButton
            onTouchTap={this.fetchOldMessages}
            label={isFetching ? '' : 'Load Older Messages'}
            disabled={isFetching}
            primary
          />
        </div>
        <div style={{ height: '100%' }}>
          <AutoSizer>
            {({ height, width }) => (
              <Table
                height={height}
                width={width}
                headerHeight={30}
                rowHeight={100}
                rowCount={incomingMessages.length}
                rowGetter={({ index }) => incomingMessages[index]}
              >
                <Column
                  label='Sent At'
                  dataKey='sentAt'
                  width={width * 0.125}
                />
                <Column
                  label='From'
                  dataKey='user_number'
                  width={width * 0.175}
                  cellRenderer={({ cellData, rowData }) => (
                    <div>
                      <b>{rowData.is_from_contact ? rowData.contactName : rowData.userName}</b>
                      <div style={{ fontSize: '11px' }}>
                          {rowData.is_from_contact ? (
                            <span>
                              {rowData.contact_number}
                              <b> CONTACT</b>
                            </span>
                          ) : (
                            <span>
                              {cellData}
                              <b> TEXTER</b>
                            </span>
                          )}
                      </div>
                    </div>
                  )}
                />
                <Column
                  label='To'
                  dataKey='contact_number'
                  width={width * 0.175}
                  cellRenderer={({ cellData, rowData }) => (
                    <div>
                      <b>{rowData.is_from_contact ? rowData.userName : rowData.contactName}</b>
                      <div style={{ fontSize: '11px' }}>
                          {rowData.is_from_contact ? (
                            <span>
                              {rowData.user_number}
                              <b> TEXTER</b>
                            </span>
                          ) : (
                            <span>
                              {cellData}
                              <b> CONTACT</b>
                            </span>
                          )}
                      </div>
                    </div>
                  )}
                />
                <Column
                  label='Message'
                  dataKey='text'
                  width={width * 0.525}
                  style={{
                    whiteSpace: 'normal',
                    fontSize: '11px'
                  }}
                />
              </Table>
            )}
          </AutoSizer>
        </div>
      </div>
    )
  }
}
