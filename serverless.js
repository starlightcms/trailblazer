const { Component } = require('@serverless/core')
const { deburr } = require('lodash/string')
const args = require('minimist')(process.argv.slice(2))


class Trailblazer extends Component {
  async default(inputs = {}){
    const { name, stage, config } = this.parseInputs(inputs)
    const template = await this.load('@sls-next/serverless-component', stage)

    await this.customizeConfig(name, stage, config)

    return await template(config)
  }

  async remove(){
    if(!args.stage){
      throw new Error('You need to provide a stage name using the --stage option.')
    }

    const stage = this.sanitize(args.stage)
    const template = await this.load('@sls-next/serverless-component', stage)
    const output = await template.remove()

    this.state = {}
    await this.save()

    return output
  }

  parseInputs(inputs) {
    if(!inputs.name){
      throw new Error('You need to provide a "name" attribute on your serverless.yml file.')
    }

    if(!args.stage && !inputs.stage){
      throw new Error('You need to provide a stage name using the --stage option (recommended) or' +
        ' manually setting it on your serverless.yml file.')
    }

    const name = this.sanitize(inputs.name)
    const stage = this.sanitize(args.stage || inputs.stage)

    return { ...inputs, name, stage }
  }

  async customizeConfig(name, stage, config){
    const id = `${name}--${stage}--${await this.getId()}`

    // Sets the current deploy stage as an environment variable
    config.build = config.build || {}
    config.build.env = Object.assign({}, config.build.env, {
      TRAILBLAZER_STAGE: stage
    })

    config.bucketName = config.bucketName || id
    config.name = config.name || id
  }

  async getId(){
    if(!this.state.id){
      this.state.id = this.context.resourceId()
      await this.save()
    }

    return this.state.id
  }

  sanitize(string){
    return deburr(string.trim().toLowerCase().replace(/\s/g, '-'))
  }
}

module.exports = Trailblazer
