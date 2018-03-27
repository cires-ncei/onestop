import React, {Component} from 'react'
import FlexScroll from '../../common/FlexScroll'
import FlexColumn from '../../common/FlexColumn'
import Button from '../../common/input/Button'
import _ from 'lodash'
import A from '../../common/link/Link'
import {identifyProtocol} from '../../utils/resultUtils'
import {SvgIcon} from '../../common/SvgIcon'

const styleLegendHeading = {
  margin: '0 0 0.618em 0',
  padding: 0,
}

const styleLegend = {
  justifyContent: 'flex-start',
  display: 'flex',
  flexFlow: 'row wrap',
  paddingBottom: '1em',
}

const styleLegendItem = {
  display: 'inline-flex',
  marginLeft: '1em',
  alignItems: 'center',
}

const styleTable = {
  padding: '2px',
  borderBottom: '1px solid #CBCBCB',
}

const styleTableHeadRow = {
  backgroundColor: '#E0E0E0',
  color: 'black',
  textAlign: 'left',
}

const styleTableCell = {
  padding: '0.618em',
  borderRight: '1px solid #CBCBCB',
}

const styleBadgesCell = {
  width: '25%',
  minWidth: '4em',
  padding: '0.309em',
}

const styleBadge = protocol => {
  return {
    borderRadius: '50%',
    width: '1em',
    height: '1em',
    lineHeight: '1em',
    padding: '0.25em',
    margin: '0.25em',
    font: 'Arial, sans-serif',
    color: 'white',
    fill: 'white',
    textAlign: 'center',
    textDecoration: 'none',
    background: `${protocol.color}`,
  }
}

const styleBadgeLayout = {
  display: 'flex',
  flexFlow: 'row wrap',
  justifyContent: 'flex-end',
}

const styleLegendLabel = {
  font: '1.2em Arial, sans-serif',
  margin: '0.6em 0',
}

const styleGranuleRow = even => {
  return {
    backgroundColor: even ? '#222' : '#111',
    color: 'white',
  }
}

const styleResultCountContainer = {
  display: 'block',
  padding: '0em 2em 1.618em 2em',
}

const styleResultCount = {
  display: 'inline',
  fontSize: '1.2em',
  margin: 0,
  padding: '0.309em',
}

const styleShowMore = {
  display: 'flex',
  justifyContent: 'center',
  paddingLeft: '2em',
  paddingRight: '2em',
}

const styleGrid = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'flex-start',
  alignContent: 'flex-start',
  margin: '0 0 0 2em',
}

export default class GranuleList extends Component {
  render() {
    const {results, totalHits, returnedHits, loading} = this.props
    const usedProtocols = new Set()
    let rowNumber = -1
    const tableRows = _.map(results, (value, key) => {
      const rowEven = rowNumber++ % 2 === 0
      _.forEach(value.links, link => usedProtocols.add(identifyProtocol(link)))
      const rowStyle = styleGranuleRow(rowEven)
      return (
        <tr style={rowStyle} key={key}>
          <td style={styleTableCell}>{value.title}</td>
          <td style={styleBadgesCell}>{this.renderBadges(value.links)}</td>
        </tr>
      )
    })

    const legendItems = _.chain(_.toArray(usedProtocols))
      .filter()
      .sortBy('id')
      .uniqBy('id')
      .map((protocol, i) => {
        return (
          <div key={i} style={styleLegendItem}>
            <div style={styleBadge(protocol)}>
              {this.renderBadgeIcon(protocol)}
            </div>
            <div style={styleLegendLabel}>{protocol.label}</div>
          </div>
        )
      })
      .value()

    const granuleLoadingMessage = this.renderLoadingMessage()

    const granuleLegend = (
      <div key="granuleLegend">
        <h3 style={styleLegendHeading}>Access Protocols:</h3>
        <div style={styleLegend}>{legendItems}</div>
      </div>
    )

    const granuleInfo = (
      <FlexColumn items={[ granuleLoadingMessage, granuleLegend ]} />
    )

    const granuleTable = (
      <table key="granuleFileList" style={styleTable}>
        <thead>
          <tr style={styleTableHeadRow}>
            <th style={styleTableCell}>Title</th>
            <th style={styleTableCell}>Data Access</th>
          </tr>
        </thead>
        <tbody>{tableRows}</tbody>
      </table>
    )

    const headingText = loading
      ? `Loading...`
      : `Search Results (showing ${returnedHits} of ${totalHits})`

    const styleResultCountMerged = {
      ...styleResultCount,
      // ...(this.state.focusingResultsCount TODO (from collectionGrid)
      //   ? styleResultCountFocus
      //   : styleResultCountFocusBlur),
    }
    return (
      <div>
        <h1
          style={styleResultCountMerged}
          tabIndex={-1}
          ref={totalHits => (this.totalHits = totalHits)}
          onFocus={this.handleFocusResultsCount}
          onBlur={this.handleBlurResultsCount}
        >
          {headingText}
        </h1>
        {/*<FlexScroll*/}
        {/*left={map}*/}
        {/*styleLeft={{marginRight: '1.618em'}}*/}
        {/*styleRight={{width: '42%'}}*/}
        {/*rightTop={granuleInfo}*/}
        {/*rightScroll={granuleTable}*/}
        {/*rightBottom={this.renderPaginationButton()}*/}
        {/*/>*/}
        <FlexColumn style={styleGrid} items={[ granuleLegend, granuleTable ]} />

        {this.renderPaginationButton()}
      </div>
    )
  }

  renderLoadingMessage() {
    const styleShowMessage = _.isEmpty(this.props.results)
      ? {padding: '1em'}
      : {display: 'none'}
    return (
      <div key="granuleLoadingMessage" style={styleShowMessage}>
        Please wait a moment while the results load...
      </div>
    )
  }

  renderBadges(links) {
    const badges = _.chain(links)
      .map(link => ({protocol: identifyProtocol(link), url: link.linkUrl}))
      .filter(info => info.protocol)
      .sortBy(info => info.protocol.id)
      .map(this.renderBadge.bind(this))
      .value()
    return _.isEmpty(badges) ? (
      <div>N/A</div>
    ) : (
      <div style={styleBadgeLayout}>{badges}</div>
    )
  }

  renderBadge = ({protocol, url}) => {
    return (
      <A
        href={url}
        key={url}
        title={url}
        target="_blank"
        style={styleBadge(protocol)}
      >
        {this.renderBadgeIcon(protocol)}
      </A>
    )
  }

  renderBadgeIcon = protocol => {
    if (protocol.svgPath) {
      return <SvgIcon path={protocol.svgPath} />
    }
    return <span>{protocol.id}</span>
  }

  renderPaginationButton() {
    const {results, totalHits, fetchMoreResults} = this.props
    if (_.size(results) < totalHits) {
      const moreResultsButton = (
        <Button
          text="Show More Results"
          onClick={fetchMoreResults}
          style={{display: 'inherit', width: '100%', borderRadius: 0}}
        />
      )
      return <div style={{padding: '2px'}}>{moreResultsButton}</div>
    }
  }
}
