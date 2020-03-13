const fs = require('fs')
const dotenv = require('dotenv')


const ignoredVariables = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
]

const dotEnvExists = (stage) => {
  try{
    fs.accessSync(`${process.cwd()}/.env${stage ? `.${stage}` : ''}`, fs.constants.F_OK)
  } catch(e){
    if(!process.env.CI){
      throw new Error(`Trailblazer: .env${stage ? `.${stage}` : ''} file not found. For safety, \
manual deployments must use file based environment variables.`)
    }

    return false
  }

  return true
}

const getVariablesFromDotEnv = (variables, stage) => {
  const environmentVariables = dotenv.parse(fs.readFileSync(`${process.cwd()}/.env${stage ? `.${stage}` : ''}`))
  const environmentVariableArray = Object.keys(environmentVariables)
  const requiredVariables = [...new Set(variables)]
  const unknownVariables = []

  for (let variable of environmentVariableArray) {
    const index = requiredVariables.indexOf(variable)

    if(index !== -1) {
      requiredVariables.splice(index, 1)
    } else {
      if (!ignoredVariables.find(v => v === variable)) {
        unknownVariables.push(variable)
      }
    }
  }

  if(requiredVariables.length){
    throw new Error(`Trailblazer: you need to set the following \
variable${requiredVariables.length !== 1 ? 's' : ''} on your .env${stage ? `.${stage}` : ''} \
file: ${requiredVariables.join(', ')}.`)
  }

  if(unknownVariables.length){
    throw new Error(`Trailblazer: the following \
variable${unknownVariables.length !== 1 ? 's are' : ' is'} set on your \
.env${stage ? `.${stage}` : ''} file, but ${unknownVariables.length !== 1 ? 'are' : 'is'} not set \
on the "variables" array of your next.config.js file: ${unknownVariables.join(', ')}. Did you \
forget to set ${unknownVariables.length !== 1 ? 'them' : 'it'}?`)
  }

  return environmentVariables
}

const getVariablesFromEnvironment = (variables) => {
  const environmentVariables = []
  const requiredVariables = [...new Set(variables)]
  const missingVariables = []

  for(let variable of requiredVariables){
    if(!process.env.hasOwnProperty(variable)){
      missingVariables.push(variable)
    } else {
      environmentVariables[variable] = process.env[variable]
    }
  }

  if(missingVariables.length){
    throw new Error(`Trailblazer: you need to set the following environment \
variable${missingVariables.length !== 1 ? 's' : ''}: ${missingVariables.join(', ')}. You can \
alternatively create a .env file containing ${missingVariables.length !== 1 ? 'these' : 'this'} \
variable${missingVariables.length !== 1 ? 's' : ''}.`)
  }

  return environmentVariables
}

const withTrailblazer = (nextConfig) => {
  if(nextConfig.variables && nextConfig.variables.length){
    const stage = process.env.TRAILBLAZER_STAGE

    if(dotEnvExists(stage)){
      console.log(`> Trailblazer: .env${stage ? `.${stage}` : ''} file found, using it instead of \
OS environment variables to populate process.env.`)

      return Object.assign({}, nextConfig, {
        env: Object.assign({}, nextConfig.env, getVariablesFromDotEnv(nextConfig.variables, stage)),
      })
    } else {
      console.log(`> Trailblazer: .env${stage ? `.${stage}` : ''} file not found, using OS \
environment variables to populate process.env.`)

      return Object.assign({}, nextConfig, {
        env: Object.assign({}, nextConfig.env, getVariablesFromEnvironment(nextConfig.variables)),
      })
    }
  }

  console.error('> Trailblazer: withEnvironment was used, but no variables were set into you' +
    ' next.config.js file. Remove the plugin or set the required variables to fix this error.')

  return nextConfig
}

module.exports = withTrailblazer
