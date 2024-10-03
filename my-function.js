export const handler = async (event, context) => {
    const keyword = event.queryStringParameters.keyword;
    return "Patrick Dutch says '" + keyword +"'! How do you respond?";
};