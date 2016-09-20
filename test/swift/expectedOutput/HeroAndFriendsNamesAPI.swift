//  This file was automatically generated and should not be edited.

import Apollo

public enum Episode: String {
  case newhope = "NEWHOPE"
  case empire = "EMPIRE"
  case jedi = "JEDI"
}

extension Episode: JSONDecodable, JSONEncodable {}

public class HeroAndFriendsNamesQuery: GraphQLQuery {
  public let episode: Episode?
  
  public init(episode: Episode?) {
    self.episode = episode
  }
  
  public let operationDefinition =
    "query HeroAndFriendsNames($episode: Episode) {" +
    "  hero(episode: $episode) {" +
    "    name" +
    "    friends {" +
    "      name" +
    "    }" +
    "  }" +
    "}"
  
  public var variables: GraphQLMap? {
    return ["episode": episode]
  }
  
  public struct Data: GraphQLMapConvertible {
    public let hero: Hero?
    
    public init(map: GraphQLMap) throws {
      hero = try map.value(forKey: "hero")
    }
    
    public struct Hero: GraphQLMapConvertible {
      public let name: String
      public let friends: [Friend?]?
      
      public init(map: GraphQLMap) throws {
        name = try map.value(forKey: "name")
        friends = try map.list(forKey: "friends")
      }
      
      public struct Friend: GraphQLMapConvertible {
        public let name: String
        
        public init(map: GraphQLMap) throws {
          name = try map.value(forKey: "name")
        }
      }
    }
  }
}
