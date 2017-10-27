import React from 'react'
import AssignmentTexter from '../components/AssignmentTexter'
import { withRouter } from 'react-router'
import loadData from './hoc/load-data'
import gql from 'graphql-tag'
import { connect } from 'react-apollo'
import ApolloClientSingleton from '../network/apollo-client-singleton'

const getContactData = (component, contactId) => {
  console.log('getContactData! entry', ApolloClientSingleton)
  const query = gql`query getContact($campaignContactId: String!) {
      contact(id: $campaignContactId) {
        id
        assignmentId
        firstName
        lastName
        cell
        zip
        customFields
        optOut {
          id
          createdAt
        }
        currentInteractionStepScript
        interactionSteps {
          id
          questionResponse(campaignContactId: $campaignContactId) {
            value
          }
          question {
            text
            answerOptions {
              value
              nextInteractionStep {
                id
                script
              }
            }
          }
        }
        location {
          city
          state
          timezone {
            offset
            hasDST
          }
        }
        messageStatus
        messages {
          id
          createdAt
          text
          isFromContact
        }
      }
    }`
  console.log('query', query)
  const xxx = { query: query, forceFetch: true, variables: { campaignContactId: contactId }}
  window.blah = ApolloClientSingleton.query(xxx)
  console.log('active query', window.blah, contactId)
  
  const queryThing = loadData(React.Component, { mapsQueriesToProps: (props) => {
    console.log('queryThing ran!', props)
    return { x: xxx}}})
  console.log('querything', queryThing)
  const compThing = new queryThing({}, {store:{getState:function(x){console.log('getstate',x, this)}, setState:function(y){console.log('setstate', y, this)}}})
  console.log('querything({})', compThing.displayName, compThing)
  //const compThingRun = new compThing({x: null}, {store:{getState:function(x){console.log('getstate',x)}, setState:function(y){console.log('setstate', y)}}})
  //console.log('compthing run', compThingRun)
  //compThingRun.componentWillReceiveProps({x: {}})
  //console.log('compthing run after', compThingRun)
  //window.foo = compThingRun
  window.bar = compThing
  const rv = {}
  //const res = await graphql(query, {}, {}, { campaignContactId: contactId })
  //console.log('res', res)
  //const rv = await res()
  //console.log('getContactData!', rv)
  return rv
}

class TexterTodo extends React.Component {
  componentWillMount() {
    const { assignment } = this.props.data
    if (!assignment || assignment.campaign.isArchived) {
      this.props.router.push(
        `/app/${this.props.params.organizationId}/todos`
      )
    }
  }

  refreshAssignmentContacts = () => this.props.data.refetch()

  render() {
    const { assignment } = this.props.data
    const contacts = assignment.contacts
    console.log('textertodo component', this)
    return (<AssignmentTexter
      assignment={assignment}
      contacts={contacts}
      getContactData={getContactData}
      onRefreshAssignmentContacts={this.refreshAssignmentContacts}
      organizationId={this.props.params.organizationId}
    />)
  }

}

TexterTodo.propTypes = {
  contactsFilter: React.PropTypes.string,
  params: React.PropTypes.object,
  data: React.PropTypes.object,
  router: React.PropTypes.object
}

const mapQueriesToProps = ({ ownProps }) => ({
  data: {
    query: gql`query getContacts($assignmentId: String!, $contactsFilter: ContactsFilter!) {
      assignment(id: $assignmentId) {
        id
        userCannedResponses {
          id
          title
          text
          isUserCreated
        }
        campaignCannedResponses {
          id
          title
          text
          isUserCreated
        }
        texter {
          id
          firstName
          lastName
          assignedCell
        }
        campaign {
          id
          isArchived
          organization {
            id
            textingHoursEnforced
            textingHoursStart
            textingHoursEnd
            threeClickEnabled
          }
          customFields
        }
        contacts(contactsFilter: $contactsFilter) {
          id
          customFields
        }
      }
    }`,
    variables: {
      contactsFilter: {
        messageStatus: ownProps.messageStatus,
        isOptedOut: false,
        validTimezone: true
      },
      assignmentId: ownProps.params.assignmentId
    },
    forceFetch: true
  }
})

export default loadData(withRouter(TexterTodo), { mapQueriesToProps })
