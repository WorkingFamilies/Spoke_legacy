import React, { Component } from 'react'
import type from 'prop-types'
import FlatButton from 'material-ui/FlatButton'
import loadData from '../../containers/hoc/load-data'
import { withRouter } from 'react-router'
import gql from 'graphql-tag'
import LoadingIndicator from '../../components/LoadingIndicator'
import DataTables from 'material-ui-datatables'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import UserEditDialog from './UserEditDialog'
import ResetPasswordDialog from './ResetPasswordDialog'
import { getHighestRole, ROLE_HIERARCHY } from '../../lib'
import { dataTest } from '../../lib/attributes'

import PeopleIcon from 'material-ui/svg-icons/social/people'
import Empty from '../../components/Empty'

const INITIAL_PAGE_SIZE = 10

const prepareDataTableData = (users) => users.map(user => ({
  texterId: user.id,
  texter: user.displayName,
  email: user.email,
  roles: user.roles
})
)

export class PeopleList extends Component {
  constructor(props) {
    super(props)

    this.state = {
      open: false,
      userEdit: undefined,
      pageSize: INITIAL_PAGE_SIZE,
      cursor: {
        offset: 0,
        limit: INITIAL_PAGE_SIZE
      },
      passwordResetHash: ''
    }

    this.requestUserEditClose = this.requestUserEditClose.bind(this)
    this.updateUser = this.updateUser.bind(this)
    this.handlePasswordResetClose = this.handlePasswordResetClose.bind(this)
  }

  componentDidUpdate = (prevProps) => {
  }

  prepareTableColumns = () => [
    {
      key: 'texter',
      label: 'Texter',
      style: {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'pre-line'
      }
    },
    {
      key: 'email',
      label: 'Email',
      style: {
        textOverflow: 'ellipsis',
        overflow: 'scroll',
        whiteSpace: 'pre-line'
      }
    },
    {
      key: 'roles',
      label: 'Role',
      style: {
        textOverflow: 'ellipsis',
        overflow: 'scroll',
        whiteSpace: 'pre-line'
      },
      render: this.renderRolesDropdown
    },
    {
      key: 'edit',
      label: '',
      style: {
        textOverflow: 'ellipsis',
        overflow: 'scroll',
        whiteSpace: 'pre-line'
      },
      render: this.renderEditButton
    },
    {
      key: 'password',
      label: '',
      style: {
        textOverflow: 'ellipsis',
        overflow: 'scroll',
        whiteSpace: 'pre-line'
      },
      render: this.renderChangePasswordButton
    }
  ]

  editUser(userId) {
    this.setState({
      userEdit: userId
    })
  }

  updateUser() {
    this.setState({
      userEdit: false,
      forceUpdateTime: Date.now()
    })
  }

  async resetPassword(userId) {
    const { currentUser } = this.props
    if (currentUser.id !== userId) {
      const res = await this
        .props
        .mutations
        .resetUserPassword(this.props.organizationId, userId)
      this.setState({ passwordResetHash: res.data.resetUserPassword })
    }
  }

  changePage = (pageDelta, pageSize) => {
    const { limit, offset, total } = this.props.users.people.pageInfo
    const currentPage = Math.floor(offset / limit)
    const maxPage = Math.floor(total / limit)
    const newPage = Math.min(maxPage, currentPage + pageDelta)
    this.props.users.fetchMore({
      variables: {
        cursor: {
          offset: newPage * pageSize,
          limit: pageSize
        }
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        const returnValue = {
          people: {
            users: []
          }
        }

        if (fetchMoreResult) {
          returnValue.people.users = fetchMoreResult.data.people.users
          returnValue.people.pageInfo = fetchMoreResult.data.people.pageInfo
        }
        return returnValue
      }
    })
  }

  handleNextPageClick = () => {
    this.changePage(1, this.state.pageSize)
  }

  handlePreviousPageClick = () => {
    this.changePage(-1, this.state.pageSize)
  }

  handleRowSizeChanged = (index, value) => {
    this.changePage(1, value)
    this.setState({ pageSize: value })
  }

  handleChange = async (userId, value) => {
    await this
      .props
      .mutations
      .editOrganizationRoles(this.props.organizationId, this.props.campaignsFilter.campaignId, userId, [value])
  }

  requestUserEditClose = () => {
    this.setState({ userEdit: false })
  }

  handleInviteTexterOpen() {
    this.setState({ open: true })
  }

  handleInviteTexterClose() {
    this.setState({ open: false })
  }
  handlePasswordResetClose() {
    this.setState({ passwordResetHash: '' })
  }

  renderRolesDropdown = (columnKey, row) => {
    const { roles, texterId } = row
    const { currentUser } = this.props
    return (
      <DropDownMenu
        value={getHighestRole(roles)}
        disabled={texterId === currentUser.id || getHighestRole(roles) === 'OWNER' && getHighestRole(currentUser.roles) !== 'OWNER'}
        onChange={(event, index, value) => this.handleChange(texterId, value)}
      >
        {ROLE_HIERARCHY.map((option) => (
          <MenuItem
            key={texterId + '_' + option}
            value={option}
            disabled={option === 'OWNER' && getHighestRole(currentUser.roles) !== 'OWNER'}
            primaryText={`${option.charAt(0).toUpperCase()}${option.substring(1).toLowerCase()}`}
          />
        ))}
      </DropDownMenu>
    )
  }

  renderEditButton = (columnKey, row) => {
    const { texterId } = row
    return (
      <FlatButton
        {...dataTest('editPerson')}
        label='Edit'
        onTouchTap={() => { this.editUser(texterId) }}
      />
    )
  }

  renderChangePasswordButton = (columnKey, row) => {
    const { texterId } = row
    const { currentUser } = this.props
    return (
      <FlatButton
        label='Reset Password'
        disabled={currentUser.id === texterId}
        onTouchTap={() => { this.resetPassword(texterId) }}
      />
    )
  }

  render() {
    if (this.props.users.loading) {
      return <LoadingIndicator />
    }

    if (!this.props.users.people.users.length) {
      return (
        <Empty
          title='No people yet'
          icon={<PeopleIcon />}
        />
      )
    }

    const { users, pageInfo } = this.props.users.people
    const { organizationId } = this.props
    const { limit, offset, total } = pageInfo
    const displayPage = Math.floor(offset / limit) + 1
    const tableData = prepareDataTableData(users)
    return (
      <div>
        <DataTables
          data={tableData}
          columns={this.prepareTableColumns()}
          page={displayPage}
          rowSize={this.state.pageSize}
          count={total}
          onNextPageClick={this.handleNextPageClick}
          onPreviousPageClick={this.handlePreviousPageClick}
          onRowSizeChange={this.handleRowSizeChanged}
        />
        {this.props.organizationId && (
          <div>
            <UserEditDialog
              open={!!this.state.userEdit}
              organizationId={organizationId}
              userId={this.state.userEdit}
              updateUser={this.updateUser}
              requestClose={this.requestUserEditClose}
            />
            <ResetPasswordDialog
              open={!!this.state.passwordResetHash}
              requestClose={this.handlePasswordResetClose}
              passwordResetHash={this.state.passwordResetHash}
            />
          </div>
        )}
      </div>
    )
  }
}

PeopleList.propTypes = {
  mutations: type.object,
  users: type.object,
  params: type.object,
  organizationId: type.string,
  campaignsFilter: type.object,
  utc: type.string,
  currentUser: type.object,
  sortBy: type.string
}

const organizationFragment = `
  id
  people(campaignId: $campaignId) {
    id
    displayName
    email
    roles(organizationId: $organizationId)
  }
`

const mapMutationsToProps = ({ ownProps }) => ({
  editOrganizationRoles: (organizationId, campaignId, userId, roles) => ({
    mutation: gql`
      mutation editOrganizationRoles($organizationId: String!, $userId: String!, $roles: [String], $campaignId: String) {
        editOrganizationRoles(organizationId: $organizationId, userId: $userId, roles: $roles, campaignId: $campaignId) {
          ${organizationFragment}
        }
      }
    `,
    variables: {
      organizationId,
      userId,
      roles,
      campaignId
    }
  }),
  resetUserPassword: (organizationId, userId) => ({
    mutation: gql`
      mutation resetUserPassword($organizationId: String!, $userId: Int!) {
        resetUserPassword(organizationId: $organizationId, userId: $userId)
      }
    `,
    variables: {
      organizationId,
      userId
    }
  })
})

const mapQueriesToProps = ({ ownProps }) => ({
  users: {
    query: gql`
        query getUsers(
        $organizationId: String!
        $cursor: OffsetLimitCursor
        $campaignsFilter: CampaignsFilter
        $sortBy: SortPeopleBy
        ) {
            people(
                organizationId: $organizationId
                cursor: $cursor
                campaignsFilter: $campaignsFilter
                sortBy: $sortBy
            ) {
                ...on PaginatedUsers {
                    pageInfo {
                        offset
                        limit
                        total
                    }
                    users {
                        id
                        displayName
                        email
                        roles(organizationId: $organizationId)
                    }
                }
            }
        }
    `,
    variables: {
      cursor: { offset: 0, limit: INITIAL_PAGE_SIZE },
      organizationId: ownProps.organizationId,
      campaignsFilter: ownProps.campaignsFilter,
      sortBy: ownProps.sortBy || 'FIRST_NAME'
    },
    forceFetch: true
  }
})


export default loadData(withRouter(PeopleList), { mapQueriesToProps, mapMutationsToProps })